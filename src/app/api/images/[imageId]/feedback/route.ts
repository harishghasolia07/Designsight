import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { FeedbackItem } from '@/models';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ imageId: string }> }
) {
    try {
        await dbConnect();

        const { imageId } = await params;
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const category = searchParams.get('category');
        const severity = searchParams.get('severity');

        // Build query
        let query: any = { imageId };

        if (role) {
            query.roles = { $in: [role] };
        }

        if (category) {
            query.category = category;
        }

        if (severity) {
            query.severity = severity;
        }

        const feedback = await FeedbackItem.find(query)
            .sort({
                severity: -1, // High > Medium > Low
                createdAt: -1  // Newest first
            })
            .lean();

        // Group by category for easier frontend consumption
        const groupedFeedback = feedback.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {} as Record<string, typeof feedback>);

        return NextResponse.json({
            success: true,
            data: {
                feedback,
                groupedFeedback,
                totalItems: feedback.length,
                filters: {
                    role,
                    category,
                    severity
                }
            }
        });

    } catch (error) {
        console.error('GET /api/images/[imageId]/feedback error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch feedback' },
            { status: 500 }
        );
    }
}