import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project, Image, FeedbackItem, IImage } from '@/models';
import { saveUploadedFile } from '@/lib/upload';
import { analyzeImageWithRateLimit } from '@/lib/gemini';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        await dbConnect();

        const { projectId } = await params;

        // Verify project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404 }
            );
        }

        // Get form data
        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No image file provided' },
                { status: 400 }
            );
        }

        // Save uploaded file
        const uploadResult = await saveUploadedFile(file, projectId);

        // Create image record
        const image = new Image({
            projectId,
            filename: uploadResult.filename,
            url: uploadResult.url,
            width: uploadResult.width,
            height: uploadResult.height,
            uploadedAt: new Date(),
            status: 'processing'
        });

        await image.save();

        // Run AI analysis synchronously to avoid serverless background task being killed
        try {
            await analyzeImageInBackground(image._id.toString(), projectId, uploadResult, file.type);
        } catch (err) {
            console.error('Synchronous analysis failed:', err);
            await Image.findByIdAndUpdate(image._id, { status: 'failed' }).exec();
        }

        const updated = await Image.findById(image._id).lean<IImage>().exec();

        return NextResponse.json({
            success: true,
            data: {
                _id: updated!._id,
                projectId: updated!.projectId,
                filename: updated!.filename,
                url: updated!.url,
                width: updated!.width,
                height: updated!.height,
                status: updated!.status,
                uploadedAt: updated!.uploadedAt
            }
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/projects/[projectId]/images error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload image'
            },
            { status: 500 }
        );
    }
}

async function analyzeImageInBackground(
    imageId: string,
    projectId: string,
    uploadResult: { filename: string; url?: string },
    mimeType: string
): Promise<void> {
    try {
        // Prefer remote URL if available (e.g., Vercel Blob); otherwise read local file
        let imageBuffer: Buffer;
        if (uploadResult.url && uploadResult.url.startsWith('https://')) {
            const res = await fetch(uploadResult.url);
            const arr = await res.arrayBuffer();
            imageBuffer = Buffer.from(arr);
        } else {
            const filePath = join(
                process.env.UPLOAD_DIR || './uploads',
                projectId,
                uploadResult.filename
            );
            imageBuffer = await readFile(filePath);
        }

        // Analyze with Gemini
        const feedbackItems = await analyzeImageWithRateLimit(imageBuffer, mimeType);

        // Save feedback items to database
        const savedFeedback = await Promise.all(
            feedbackItems.map(item => {
                const feedback = new FeedbackItem({
                    imageId,
                    category: item.category === 'content' ? 'copy' : item.category, // Map content to copy
                    severity: item.severity,
                    roles: item.roles,
                    bbox: item.bbox,
                    anchorType: item.anchorType,
                    title: item.title,
                    text: item.text,
                    recommendations: item.recommendations,
                    aiProvider: 'gemini',
                    aiModelVersion: item.modelVersion || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
                    createdAt: new Date()
                });
                return feedback.save();
            })
        );

        // Update image status to done
        await Image.findByIdAndUpdate(imageId, {
            status: 'done',
            analysisId: savedFeedback[0]?._id // Reference to first feedback item
        });
    } catch (error) {
        console.error('Background analysis error:', error);
        throw error;
    }
}