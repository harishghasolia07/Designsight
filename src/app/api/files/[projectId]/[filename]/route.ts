import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { stat } from 'fs/promises';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string; filename: string }> }
) {
    try {
        const { projectId, filename } = await params;

        // Security: Prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json(
                { success: false, error: 'Invalid filename' },
                { status: 400 }
            );
        }

        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        const filePath = join(uploadDir, projectId, filename);

        // Check if file exists
        try {
            await stat(filePath);
        } catch {
            return NextResponse.json(
                { success: false, error: 'File not found' },
                { status: 404 }
            );
        }

        // Read file
        const fileBuffer = await readFile(filePath);

        // Determine content type
        let contentType = 'application/octet-stream';
        const extension = filename.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'jpg':
            case 'jpeg':
                contentType = 'image/jpeg';
                break;
            case 'png':
                contentType = 'image/png';
                break;
            case 'webp':
                contentType = 'image/webp';
                break;
        }

        return new NextResponse(new Uint8Array(fileBuffer), {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
            },
        });

    } catch (error) {
        console.error('File serving error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to serve file' },
            { status: 500 }
        );
    }
}