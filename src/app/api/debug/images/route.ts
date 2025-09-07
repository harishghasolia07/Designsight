import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Image } from '@/models';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        // Get all images with their current status
        const images = await Image.find({})
            .sort({ uploadedAt: -1 })
            .lean();

        // Group by status for debugging
        const statusCounts = images.reduce((acc, img) => {
            acc[img.status] = (acc[img.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Find potentially stuck images (processing for more than 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const stuckImages = images.filter(img =>
            img.status === 'processing' && new Date(img.uploadedAt) < tenMinutesAgo
        );

        return NextResponse.json({
            success: true,
            data: {
                totalImages: images.length,
                statusCounts,
                stuckImages: stuckImages.map(img => ({
                    id: img._id,
                    filename: img.filename,
                    status: img.status,
                    uploadedAt: img.uploadedAt,
                    projectId: img.projectId
                })),
                allImages: images.map(img => ({
                    id: img._id,
                    filename: img.filename,
                    status: img.status,
                    uploadedAt: img.uploadedAt,
                    projectId: img.projectId
                }))
            }
        });

    } catch (error) {
        console.error('Debug images error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch debug info' },
            { status: 500 }
        );
    }
}

// POST endpoint to manually fix stuck images
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const body = await request.json();
        const { imageId, newStatus } = body;

        if (!imageId || !newStatus) {
            return NextResponse.json(
                { success: false, error: 'imageId and newStatus are required' },
                { status: 400 }
            );
        }

        if (!['processing', 'done', 'failed'].includes(newStatus)) {
            return NextResponse.json(
                { success: false, error: 'Invalid status. Must be processing, done, or failed' },
                { status: 400 }
            );
        }

        const result = await Image.findByIdAndUpdate(
            imageId,
            { status: newStatus },
            { new: true }
        );

        if (!result) {
            return NextResponse.json(
                { success: false, error: 'Image not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: result._id,
                filename: result.filename,
                status: result.status,
                message: `Image status updated to ${newStatus}`
            }
        });

    } catch (error) {
        console.error('Update image status error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update image status' },
            { status: 500 }
        );
    }
}