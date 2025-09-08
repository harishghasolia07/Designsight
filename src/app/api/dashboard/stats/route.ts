import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Image, FeedbackItem, Project } from '@/models';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await dbConnect();

        // Get user's projects first
        const userProjects = await Project.find({ ownerId: userId }).select('_id');
        const projectIds = userProjects.map(p => p._id);

        // Get images from user's projects only
        const images = await Image.find({
            projectId: { $in: projectIds },
            status: 'done'
        })
            .sort({ uploadedAt: -1 })
            .lean();

        const imageIds = images.map(img => img._id);

        // Get total count of feedback items for user's images only
        const totalFeedbackItems = await FeedbackItem.countDocuments({
            imageId: { $in: imageIds }
        });

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