import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Comment, FeedbackItem } from '@/models';
import { z } from 'zod';

const createCommentSchema = z.object({
    body: z.string().min(1).max(1000),
    authorId: z.string(),
    parentId: z.string().optional()
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ feedbackId: string }> }
) {
    try {
        await dbConnect();

        const { feedbackId } = await params;

        // Verify feedback exists
        const feedback = await FeedbackItem.findById(feedbackId);
        if (!feedback) {
            return NextResponse.json(
                { success: false, error: 'Feedback not found' },
                { status: 404 }
            );
        }

        // Get all comments for this feedback item
        const comments = await Comment.find({ feedbackId })
            .populate('authorId', 'name email role')
            .sort({ createdAt: 1 }) // Oldest first for threading
            .lean();

        // Organize comments into threads
        const threaded = organizeCommentsIntoThreads(comments);

        return NextResponse.json({
            success: true,
            data: {
                comments,
                threaded,
                totalComments: comments.length
            }
        });

    } catch (error) {
        console.error('GET /api/feedback/[feedbackId]/comments error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch comments' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ feedbackId: string }> }
) {
    try {
        await dbConnect();

        const { feedbackId } = await params;

        // Verify feedback exists
        const feedback = await FeedbackItem.findById(feedbackId);
        if (!feedback) {
            return NextResponse.json(
                { success: false, error: 'Feedback not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const validatedData = createCommentSchema.parse(body);

        // If parentId is provided, verify parent comment exists
        if (validatedData.parentId) {
            const parentComment = await Comment.findById(validatedData.parentId);
            if (!parentComment || parentComment.feedbackId.toString() !== feedbackId) {
                return NextResponse.json(
                    { success: false, error: 'Parent comment not found' },
                    { status: 400 }
                );
            }
        }

        const comment = new Comment({
            feedbackId,
            body: validatedData.body,
            authorId: validatedData.authorId,
            parentId: validatedData.parentId || null,
            createdAt: new Date()
        });

        await comment.save();

        // Populate the author info for response
        await comment.populate('authorId', 'name email role');

        return NextResponse.json({
            success: true,
            data: comment
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/feedback/[feedbackId]/comments error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid input data', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to create comment' },
            { status: 500 }
        );
    }
}

function organizeCommentsIntoThreads(comments: any[]): any[] {
    const commentMap = new Map();
    const threads: any[] = [];

    // First pass: create comment map
    comments.forEach(comment => {
        commentMap.set(comment._id.toString(), {
            ...comment,
            replies: []
        });
    });

    // Second pass: organize into threads
    comments.forEach(comment => {
        const commentWithReplies = commentMap.get(comment._id.toString());

        if (comment.parentId) {
            // This is a reply
            const parent = commentMap.get(comment.parentId.toString());
            if (parent) {
                parent.replies.push(commentWithReplies);
            }
        } else {
            // This is a top-level comment
            threads.push(commentWithReplies);
        }
    });

    return threads;
}