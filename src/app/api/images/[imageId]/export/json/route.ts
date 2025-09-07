import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Image, FeedbackItem, Comment, IImage, IFeedbackItem } from '@/models';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ imageId: string }> }
) {
    try {
        await dbConnect();

        const { imageId } = await params;

        // Get image details
        const image = await Image.findById(imageId).lean() as IImage | null;
        if (!image) {
            return NextResponse.json(
                { success: false, error: 'Image not found' },
                { status: 404 }
            );
        }

        // Get all feedback for this image
        const feedback = await FeedbackItem.find({ imageId }).lean() as unknown as IFeedbackItem[];

        // Get comments for each feedback item
        const feedbackWithComments = await Promise.all(
            feedback.map(async (item) => {
                const comments = await Comment.find({ feedbackId: item._id })
                    .populate('authorId', 'name email role')
                    .lean();

                return {
                    ...item,
                    comments: comments.map(comment => ({
                        id: comment._id,
                        body: comment.body,
                        author: comment.authorId,
                        createdAt: comment.createdAt,
                        editedAt: comment.editedAt
                    }))
                } as IFeedbackItem & { comments: any[] };
            })
        );

        // Build export data
        const exportData = {
            exportedAt: new Date().toISOString(),
            image: {
                id: image._id,
                filename: image.filename,
                width: image.width,
                height: image.height,
                uploadedAt: image.uploadedAt,
                status: image.status
            },
            feedback: feedbackWithComments.map(item => ({
                id: item._id,
                category: item.category,
                severity: item.severity,
                roles: item.roles,
                boundingBox: item.bbox,
                anchorType: item.anchorType,
                title: item.title,
                description: item.text,
                recommendations: item.recommendations,
                aiProvider: item.aiProvider,
                aiModelVersion: item.aiModelVersion,  // Include AI model version
                createdAt: item.createdAt,
                comments: item.comments
            })),
            summary: {
                totalFeedbackItems: feedbackWithComments.length,
                severityBreakdown: {
                    high: feedbackWithComments.filter(item => item.severity === 'high').length,
                    medium: feedbackWithComments.filter(item => item.severity === 'medium').length,
                    low: feedbackWithComments.filter(item => item.severity === 'low').length
                },
                categoryBreakdown: {
                    accessibility: feedbackWithComments.filter(item => item.category === 'accessibility').length,
                    visual_hierarchy: feedbackWithComments.filter(item => item.category === 'visual_hierarchy').length,
                    copy: feedbackWithComments.filter(item => item.category === 'copy').length,
                    ui_pattern: feedbackWithComments.filter(item => item.category === 'ui_pattern').length
                },
                totalComments: feedbackWithComments.reduce((sum, item) => sum + item.comments.length, 0)
            }
        };

        // Set filename for download
        const filename = `${image.filename.split('.')[0]}_feedback_${new Date().toISOString().split('T')[0]}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error('JSON export error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to export feedback' },
            { status: 500 }
        );
    }
}