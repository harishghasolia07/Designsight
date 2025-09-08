import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Image } from '@/models';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        await dbConnect();

        const { projectId } = await params;

        // Get all images for this project
        const images = await Image.find({ projectId })
            .sort({ uploadedAt: -1 }) // Most recent first
            .lean();

        return NextResponse.json({
            success: true,
            data: images
        });

    } catch (error) {
        console.error('GET /api/projects/[projectId]/images error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch project images' },
            { status: 500 }
        );
    }
}