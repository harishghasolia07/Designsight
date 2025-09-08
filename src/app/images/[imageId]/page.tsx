'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Comments from '@/components/Comments';
import {
    ArrowLeft,
    MessageSquare,
    Download,
    Filter,
    Eye,
    AlertTriangle,
    Info,
    Zap
} from 'lucide-react';

interface FeedbackItem {
    _id: string;
    category: 'accessibility' | 'visual_hierarchy' | 'copy' | 'ui_pattern';
    severity: 'high' | 'medium' | 'low';
    roles: string[];
    bbox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    title: string;
    text: string;
    recommendations: string[];
    createdAt: string;
}

interface ImageData {
    _id: string;
    projectId: string;
    filename: string;
    url: string;
    width: number;
    height: number;
    status: string;
}

interface Comment {
    _id: string;
    feedbackId: string;
    parentId?: string;
    authorId: string;
    body: string;
    createdAt: string;
    editedAt?: string;
    author?: {
        name: string;
        email: string;
        role: string;
    };
    replies?: Comment[];
}

const ROLE_OPTIONS = [
    { value: 'all', label: 'All Roles' },
    { value: 'designer', label: 'Designer' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'pm', label: 'Product Manager' },
    { value: 'developer', label: 'Developer' }
];

const CATEGORY_COLORS = {
    accessibility: 'bg-red-500',
    visual_hierarchy: 'bg-blue-500',
    copy: 'bg-green-500',
    ui_pattern: 'bg-purple-500'
};

const SEVERITY_COLORS = {
    high: 'border-red-500 bg-red-500/10',
    medium: 'border-yellow-500 bg-yellow-500/10',
    low: 'border-green-500 bg-green-500/10'
};

export default function ImageViewerPage() {
    const { isLoaded, isSignedIn } = useUser();
    const params = useParams();
    const router = useRouter();
    const imageId = params.imageId as string;

    const [imageData, setImageData] = useState<ImageData | null>(null);
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [filteredFeedback, setFilteredFeedback] = useState<FeedbackItem[]>([]);
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchImageData = async () => {
        try {
            const response = await fetch(`/api/images/${imageId}`);
            const data = await response.json();

            if (data.success) {
                setImageData(data.data.image);
                setFeedback(data.data.feedback || []);
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to fetch image data:', error);
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            router.push('/sign-in');
        }
    }, [isLoaded, isSignedIn, router]);

    useEffect(() => {
        if (imageId) {
            fetchImageData();
        }
    }, [imageId]);

    useEffect(() => {
        if (selectedRole === 'all') {
            setFilteredFeedback(feedback);
        } else {
            setFilteredFeedback(feedback.filter(item => item.roles.includes(selectedRole)));
        }
    }, [feedback, selectedRole]);

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

    const fetchComments = async (feedbackId: string) => {
        try {
            const response = await fetch(`/api/feedback/${feedbackId}/comments`);
            const data = await response.json();

            if (data.success) {
                setComments(data.data.comments || []);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const handleImageLoad = () => {
        setImageLoaded(true);
        if (imageRef.current && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const imageRect = imageRef.current.getBoundingClientRect();

            setImageSize({
                width: imageRect.width,
                height: imageRect.height
            });
        }
    };

    const handleFeedbackClick = (item: FeedbackItem) => {
        setSelectedFeedback(item);
        fetchComments(item._id);
    };

    const handleCommentAdded = (newComment: Comment) => {
        // Re-fetch all comments to ensure proper threading
        if (selectedFeedback) {
            fetchComments(selectedFeedback._id);
        }
    };

    const convertToPixelCoordinates = (bbox: FeedbackItem['bbox']) => {
        if (!imageSize.width || !imageSize.height) return bbox;

        return {
            x: bbox.x * imageSize.width,
            y: bbox.y * imageSize.height,
            width: bbox.width * imageSize.width,
            height: bbox.height * imageSize.height
        };
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'high':
                return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'medium':
                return <Info className="w-4 h-4 text-yellow-500" />;
            case 'low':
                return <Zap className="w-4 h-4 text-green-500" />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading image...</p>
                </div>
            </div>
        );
    }

    if (!imageData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <h3 className="text-lg font-semibold mb-2">Image not found</h3>
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center h-auto sm:h-16 px-4 py-3 sm:py-0 gap-3 sm:gap-0">
                    {/* Back button - far left */}
                    <div className="flex-shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/projects/${imageData.projectId}`)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Back to Project</span>
                            <span className="sm:hidden">Back</span>
                        </Button>
                    </div>

                    {/* Filename - aligned with image start */}
                    <div className="flex-1 flex justify-center">
                        <div className="text-center">
                            <h1 className="text-lg sm:text-xl font-bold truncate max-w-[200px] sm:max-w-none">
                                {imageData.filename}
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                {filteredFeedback.length} feedback items
                            </p>
                        </div>
                    </div>

                    {/* Controls - far right */}
                    <div className="flex-shrink-0 flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="px-2 sm:px-3 py-1 sm:py-2 border border-input bg-background rounded-md text-xs sm:text-sm flex-1 sm:flex-none"
                        >
                            {ROLE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <div className="flex space-x-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/api/images/${imageId}/export/json`, '_blank')}
                                className="px-2 sm:px-3"
                            >
                                <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                <span className="hidden sm:inline">JSON</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/api/images/${imageId}/export/pdf`, '_blank')}
                                className="px-2 sm:px-3"
                            >
                                <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                <span className="hidden sm:inline">PDF</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] sm:h-[calc(100vh-64px)]">
                {/* Image Viewer */}
                <div className="flex-1 p-2 sm:p-4 overflow-auto">
                    <div className="flex items-center justify-center min-h-full">
                        <div ref={containerRef} className="relative inline-block">
                            <Image
                                ref={imageRef}
                                src={imageData.url}
                                alt={imageData.filename}
                                width={imageData.width}
                                height={imageData.height}
                                className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                                onLoad={handleImageLoad}
                                priority
                            />

                            {/* Feedback Overlays */}
                            {imageLoaded && filteredFeedback.map((item) => {
                                const pixelCoords = convertToPixelCoordinates(item.bbox);
                                const isSelected = selectedFeedback?._id === item._id;

                                return (
                                    <div
                                        key={item._id}
                                        className={`absolute border-2 cursor-pointer transition-all ${isSelected
                                            ? 'border-primary bg-primary/20 z-10'
                                            : `${SEVERITY_COLORS[item.severity]} hover:bg-opacity-30`
                                            }`}
                                        style={{
                                            left: pixelCoords.x,
                                            top: pixelCoords.y,
                                            width: pixelCoords.width,
                                            height: pixelCoords.height,
                                        }}
                                        onClick={() => handleFeedbackClick(item)}
                                    >
                                        {/* Feedback indicator */}
                                        <div className={`absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${CATEGORY_COLORS[item.category]
                                            }`}>
                                            {filteredFeedback.indexOf(item) + 1}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Feedback Panel */}
                <div className="w-full lg:w-96 border-t lg:border-l bg-muted/50 flex flex-col max-h-[50vh] lg:max-h-none">
                    <div className="p-3 sm:p-4 border-b">
                        <h2 className="text-base sm:text-lg font-semibold flex items-center">
                            <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Feedback ({filteredFeedback.length})
                        </h2>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {filteredFeedback.length === 0 ? (
                            <div className="p-4 text-center">
                                <Eye className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground">
                                    No feedback available for the selected role.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 p-2 sm:p-4">
                                {filteredFeedback.map((item, index) => (
                                    <Card
                                        key={item._id}
                                        className={`cursor-pointer transition-all ${selectedFeedback?._id === item._id
                                            ? 'ring-2 ring-primary'
                                            : 'hover:shadow-sm'
                                            }`}
                                        onClick={() => handleFeedbackClick(item)}
                                    >
                                        <CardContent className="p-3 sm:p-4">
                                            <div className="flex items-start space-x-2 sm:space-x-3">
                                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${CATEGORY_COLORS[item.category]
                                                    }`}>
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                                                        {getSeverityIcon(item.severity)}
                                                        <span className="font-semibold text-xs sm:text-sm">{item.title}</span>
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">
                                                        {item.text}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.roles.map(role => (
                                                            <span
                                                                key={role}
                                                                className="px-1 sm:px-2 py-0.5 sm:py-1 bg-secondary text-secondary-foreground text-xs rounded"
                                                            >
                                                                {role}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Feedback Details */}
                    {selectedFeedback && (
                        <div className="border-t bg-background max-h-[40vh] lg:max-h-96 overflow-auto">
                            <div className="p-3 sm:p-4">
                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                    <h3 className="font-semibold text-sm sm:text-base">Feedback Details</h3>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedFeedback(null)}
                                    >
                                        ×
                                    </Button>
                                </div>

                                <div className="space-y-3 sm:space-y-4">
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-medium mb-1">Recommendations:</h4>
                                        <ul className="text-xs sm:text-sm space-y-1">
                                            {selectedFeedback.recommendations.map((rec, index) => (
                                                <li key={index} className="flex items-start space-x-2">
                                                    <span className="text-primary">•</span>
                                                    <span>{rec}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <Comments
                                            feedbackId={selectedFeedback._id}
                                            comments={comments}
                                            onCommentAdded={handleCommentAdded}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}