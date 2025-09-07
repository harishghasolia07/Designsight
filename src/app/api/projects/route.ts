import { NextRequest, NextResponse } from 'next/server';
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
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const ownerId = searchParams.get('ownerId');

        const query = ownerId ? { ownerId } : {};
        const projects = await Project.find(query)
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
        await dbConnect();

        const body = await request.json();
        const validatedData = createProjectSchema.parse(body);

        const project = new Project({
            name: validatedData.name,
            description: validatedData.description,
            ownerId: validatedData.ownerId,
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