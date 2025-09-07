import { z } from 'zod';

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    details?: any;
}

// Validation schemas
export const createProjectSchema = z.object({
    name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    ownerId: z.string().min(1, 'Owner ID is required')
});

export const createCommentSchema = z.object({
    body: z.string().min(1, 'Comment body is required').max(1000, 'Comment too long'),
    authorId: z.string().min(1, 'Author ID is required'),
    parentId: z.string().optional()
});

export const imageUploadSchema = z.object({
    file: z.any(),
    projectId: z.string().min(1, 'Project ID is required')
});

// Error handling utilities
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export function createApiResponse<T>(
    success: boolean,
    data?: T,
    error?: string,
    details?: any
): ApiResponse<T> {
    return {
        success,
        ...(data && { data }),
        ...(error && { error }),
        ...(details && { details })
    };
}

export function handleApiError(error: any): ApiResponse {
    console.error('API Error:', error);

    if (error instanceof z.ZodError) {
        return createApiResponse(false, undefined, 'Validation error', error.errors);
    }

    if (error instanceof AppError) {
        return createApiResponse(false, undefined, error.message);
    }

    if (error.name === 'MongoError' || error.name === 'MongooseError') {
        return createApiResponse(false, undefined, 'Database error');
    }

    return createApiResponse(false, undefined, 'Internal server error');
}

// File validation utilities
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
    }

    return { valid: true };
}

// Coordinate validation
export function validateBoundingBox(bbox: any): boolean {
    if (!bbox || typeof bbox !== 'object') return false;

    const { x, y, width, height } = bbox;

    return (
        typeof x === 'number' && x >= 0 && x <= 1 &&
        typeof y === 'number' && y >= 0 && y <= 1 &&
        typeof width === 'number' && width >= 0 && width <= 1 &&
        typeof height === 'number' && height >= 0 && height <= 1 &&
        x + width <= 1 &&
        y + height <= 1
    );
}

// Text sanitization
export function sanitizeText(text: string): string {
    return text
        .trim()
        .replace(/[<>\"'&]/g, (match) => {
            const entities: { [key: string]: string } = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return entities[match];
        });
}

// Date utilities
export function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const target = typeof date === 'string' ? new Date(date) : date;
    const diffInMs = now.getTime() - target.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return target.toLocaleDateString();
}

// Status utilities
export function getStatusColor(status: string): string {
    switch (status) {
        case 'done':
            return 'text-green-600';
        case 'processing':
            return 'text-blue-600';
        case 'failed':
            return 'text-red-600';
        default:
            return 'text-yellow-600';
    }
}

export function getSeverityColor(severity: string): string {
    switch (severity) {
        case 'high':
            return 'text-red-600 bg-red-50 border-red-200';
        case 'medium':
            return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'low':
            return 'text-green-600 bg-green-50 border-green-200';
        default:
            return 'text-gray-600 bg-gray-50 border-gray-200';
    }
}

// Retry utilities
export async function retryAsync<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }

    throw lastError!;
}