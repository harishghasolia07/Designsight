import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import { Project, IProject } from '@/models';
import { z } from 'zod';

const createProjectSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    ownerId: z.string()
});

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

        // Only fetch projects owned by the authenticated user
        const projects = await Project.find({ ownerId: userId })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: projects
        });
    } catch (error) {
        console.error('GET /api/projects error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch projects' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await dbConnect();

        const body = await request.json();
        const validatedData = createProjectSchema.parse(body);

        const project = new Project({
            name: validatedData.name,
            description: validatedData.description,
            ownerId: userId, // Use the authenticated user's ID
            createdAt: new Date()
        });

        await project.save();

        return NextResponse.json({
            success: true,
            data: project
        }, { status: 201 });
    } catch (error) {
        console.error('POST /api/projects error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Invalid input data', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to create project' },
            { status: 500 }
        );
    }
}