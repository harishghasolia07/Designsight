import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Image, FeedbackItem } from '@/models';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ imageId: string }> }
) {
    try {
        await dbConnect();

        const { imageId } = await params;
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');

        // Get image details
        const image = await Image.findById(imageId).lean();
        if (!image) {
            return NextResponse.json(
                { success: false, error: 'Image not found' },
                { status: 404 }
            );
        }

        // Get feedback items with optional role filtering
        let feedbackQuery: any = { imageId };
        if (role) {
            feedbackQuery.roles = { $in: [role] };
        }

        const feedback = await FeedbackItem.find(feedbackQuery)
            .sort({ severity: -1, createdAt: -1 }) // High severity first, then newest
            .lean();

        return NextResponse.json({
            success: true,
            data: {
                image,
                feedback,
                totalFeedback: feedback.length
            }
        });

    } catch (error) {
        console.error('GET /api/images/[imageId] error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch image details' },
            { status: 500 }
        );
    }
}