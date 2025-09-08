import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export interface UploadResult {
    filename: string;
    url: string;
    width: number;
    height: number;
    size: number;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function saveUploadedFile(
    file: File,
    projectId: string
): Promise<UploadResult> {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const bytes = await file.arrayBuffer();
    const buffer: Buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${uuidv4()}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, projectId, filename);

    // Ensure directory exists
    const projectDir = join(UPLOAD_DIR, projectId);
    await ensureDirectoryExists(projectDir);

    // Get image dimensions and optimize
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image file');
    }

    // Optimize image (resize if too large, compress)
    let processedBuffer: Buffer = buffer;
    if (metadata.width > 2048 || metadata.height > 2048) {
        processedBuffer = await image
            .resize(2048, 2048, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toBuffer();
    }

    // Save file
    await writeFile(filePath, processedBuffer);

    // Get final dimensions
    const finalMetadata = await sharp(processedBuffer).metadata();

    return {
        filename,
        url: `/api/files/${projectId}/${filename}`,
        width: finalMetadata.width!,
        height: finalMetadata.height!,
        size: processedBuffer.length
    };
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
        const { mkdir } = await import('fs/promises');
        await mkdir(dirPath, { recursive: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
            throw error;
        }
    }
}

export function getFileExtension(mimeType: string): string {
    switch (mimeType) {
        case 'image/jpeg':
            return 'jpg';
        case 'image/png':
            return 'png';
        case 'image/webp':
            return 'webp';
        default:
            return 'jpg';
    }
}