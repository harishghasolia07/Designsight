'use client';
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    Upload,
    Eye,
    Download,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Clock,
    X
} from 'lucide-react';

interface Project {
    _id: string;
    name: string;
    description?: string;
    createdAt: string;
    ownerId: string;
}

interface ImageItem {
    _id: string;
    projectId: string;
    filename: string;
    url: string;
    width: number;
    height: number;
    status: 'uploaded' | 'processing' | 'done' | 'failed';
    uploadedAt: string;
}

export default function ProjectDetailPage() {
    const { isLoaded, isSignedIn } = useUser();
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    // Redirect effect (avoid conditional hook calls)
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/sign-in');
        }
    }, [isLoaded, isSignedIn, router]);

    const [project, setProject] = useState<Project | null>(null);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    useEffect(() => {
        if (projectId) {
            fetchProjectDetails();
            fetchProjectImages();
        }
    }, [projectId]);

    // Cleanup effect for polling intervals
    useEffect(() => {
        return () => {
            pollingIntervalsRef.current.forEach(intervalId => {
                clearInterval(intervalId);
            });
            pollingIntervalsRef.current.clear();
        };
    }, []);

    const fetchProjectDetails = async () => {
        try {
            const response = await fetch(`/api/projects`);
            const data = await response.json();
            if (data.success) {
                const foundProject = data.data.find((p: Project) => p._id === projectId);
                if (foundProject) {
                    setProject(foundProject);
                } else {
                    router.push('/');
                }
            }
        } catch (error) {
            console.error('Failed to fetch project:', error);
            router.push('/');
        }
    };

    const startPollingForImage = useCallback((imageId: string) => {
        // Prevent duplicate polling
        if (pollingIntervalsRef.current.has(imageId)) {
            return;
        }

        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`/api/projects/${projectId}/images/list`);
                const data = await response.json();

                if (data.success) {
                    const updatedImage = data.data.find((img: ImageItem) => img._id === imageId);

                    if (updatedImage && (updatedImage.status === 'done' || updatedImage.status === 'failed')) {
                        // Stop polling and update state
                        const currentInterval = pollingIntervalsRef.current.get(imageId);
                        if (currentInterval) {
                            clearInterval(currentInterval);
                            pollingIntervalsRef.current.delete(imageId);
                        }
                        setImages(data.data);
                        return;
                    } else if (updatedImage && updatedImage.status === 'processing') {
                        // Only update state if we have actual changes to avoid unnecessary re-renders
                        setImages(prevImages => {
                            const hasChanges = prevImages.some(img =>
                                img._id === imageId && img.status !== updatedImage.status
                            );
                            return hasChanges ? data.data : prevImages;
                        });
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
                // Stop polling on error
                const currentInterval = pollingIntervalsRef.current.get(imageId);
                if (currentInterval) {
                    clearInterval(currentInterval);
                    pollingIntervalsRef.current.delete(imageId);
                }
            }
        }, 2000);

        // Store interval
        pollingIntervalsRef.current.set(imageId, intervalId);

        // Auto-cleanup after 5 minutes
        setTimeout(() => {
            const currentInterval = pollingIntervalsRef.current.get(imageId);
            if (currentInterval) {
                clearInterval(currentInterval);
                pollingIntervalsRef.current.delete(imageId);
            }
        }, 300000);
    }, [projectId]);

    const fetchProjectImages = useCallback(async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}/images/list`);
            const data = await response.json();
            if (data.success) {
                setImages(data.data);
                // Only start polling for images that are actually processing
                data.data.forEach((image: ImageItem) => {
                    if (image.status === 'processing' && !pollingIntervalsRef.current.has(image._id)) {
                        startPollingForImage(image._id);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to fetch images:', error);
        } finally {
            setLoading(false);
        }
    }, [projectId, startPollingForImage]);

    const handleFileUpload = async (files: FileList) => {
        if (!files.length) return;

        setUploading(true);

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) {
                alert('Please upload only image files');
                continue;
            }

            // Delay showing the card by ~2s: button shows "Uploading..." meanwhile
            setUploading(true);
            const tempId = `temp-${crypto.randomUUID()}`;
            let serverRecord: ImageItem | null = null;
            let optimisticInserted = false;
            let usedTemp = false;

            const timerId = setTimeout(() => {
                optimisticInserted = true;
                if (serverRecord) {
                    const rec = serverRecord as ImageItem;
                    setImages(prev => [rec, ...prev]);
                    if (rec.status === 'processing') {
                        startPollingForImage(rec._id);
                    }
                } else {
                    const tempImage: ImageItem = {
                        _id: tempId,
                        projectId,
                        filename: file.name,
                        url: URL.createObjectURL(file),
                        width: 0,
                        height: 0,
                        status: 'processing',
                        uploadedAt: new Date().toISOString(),
                    };
                    usedTemp = true;
                    setImages(prev => [tempImage, ...prev]);
                }
                setUploading(false);
            }, 2000);

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch(`/api/projects/${projectId}/images`, {
                    method: 'POST',
                    body: formData,
                });

                const data = await response.json();
                if (data.success) {
                    serverRecord = data.data as ImageItem;
                    if (optimisticInserted) {
                        // If temp card was shown, replace it now
                        setImages(prev => [serverRecord!, ...prev.filter(img => img._id !== tempId)]);
                        if (serverRecord!.status === 'processing') {
                            startPollingForImage(serverRecord!._id);
                        }
                    } // else wait for timer to insert
                } else {
                    if (optimisticInserted && usedTemp) {
                        setImages(prev => prev.filter(img => img._id !== tempId));
                    }
                    clearTimeout(timerId);
                    setUploading(false);
                    alert(`Failed to upload ${file.name}: ${data.error}`);
                }
            } catch (error) {
                console.error('Upload error:', error);
                if (optimisticInserted && usedTemp) {
                    setImages(prev => prev.filter(img => img._id !== tempId));
                }
                clearTimeout(timerId);
                setUploading(false);
                alert(`Failed to upload ${file.name}`);
            }
        }

        setUploading(false);
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files);
        }
    }, [projectId]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'done':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'processing':
                return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'failed':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Clock className="w-4 h-4 text-yellow-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'done':
                return 'Analysis Complete';
            case 'processing':
                return 'Analyzing...';
            case 'failed':
                return 'Analysis Failed';
            default:
                return 'Uploaded';
        }
    };

    // Gate rendering until Clerk loads or user is redirected
    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isSignedIn) {
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Project not found</h3>
                        <p className="text-muted-foreground mb-4">
                            The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
                        </p>
                        <Button onClick={() => router.push('/')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Link href="/">
                                <Button variant="outline" size="sm">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                                {project.description && (
                                    <p className="text-muted-foreground mt-1">{project.description}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => window.open(`/api/images/${images[0]?._id}/export/json`, '_blank')}
                                disabled={images.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export JSON
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.open(`/api/images/${images[0]?._id}/export/pdf`, '_blank')}
                                disabled={images.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export PDF
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Upload Area */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Upload Design Images</CardTitle>
                        <CardDescription>
                            Upload your design images to get AI-powered feedback and insights
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-primary' : 'text-muted-foreground'
                                }`} />
                            <h3 className="text-lg font-semibold mb-2">
                                {dragActive ? 'Drop your images here' : 'Upload design images'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Drag and drop images here, or click to browse
                            </p>
                            <Input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                                className="hidden"
                                id="file-upload"
                            />
                            <Button disabled={uploading}>
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    {uploading ? (
                                        <>
                                            <RefreshCw className="w-20 h-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-20 h-4 mr-2" />
                                            Choose Files
                                        </>
                                    )}
                                </label>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Images Grid */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">
                        Uploaded Images ({images.length})
                    </h2>

                    {images.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Eye className="w-12 h-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No images yet</h3>
                                <p className="text-muted-foreground text-center">
                                    Upload your first design image to start getting AI-powered feedback
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {images.map((image) => (
                                <Card key={image._id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="aspect-video relative bg-muted">
                                        <Image
                                            src={image.url}
                                            alt={image.filename}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-medium truncate" title={image.filename}>
                                                {image.filename}
                                            </h3>
                                            {getStatusIcon(image.status)}
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {getStatusText(image.status)}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => router.push(`/images/${image._id}`)}
                                                disabled={image.status !== 'done'}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(`/api/images/${image._id}/export/json`, '_blank')}
                                                disabled={image.status !== 'done'}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}