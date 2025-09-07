import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Image, FeedbackItem } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        // Get all images (analyzed images)
        const images = await Image.find({ status: 'done' })
            .sort({ uploadedAt: -1 })
            .lean();

        // Get total count of feedback items across all images
        const totalFeedbackItems = await FeedbackItem.countDocuments();

        return NextResponse.json({
            success: true,
            data: {
                images,
                totalImages: images.length,
                totalFeedbackItems
            }
        });

    } catch (error) {
        console.error('Dashboard stats API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard statistics' },
            { status: 500 }
        );
    }
}