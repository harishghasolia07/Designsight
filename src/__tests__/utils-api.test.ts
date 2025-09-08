import { validateBoundingBox, validateImageFile, formatRelativeTime } from '@/lib/utils-api';

describe('API Utils', () => {
    describe('validateBoundingBox', () => {
        it('should validate correct bounding box', () => {
            const bbox = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
            expect(validateBoundingBox(bbox)).toBe(true);
        });

        it('should reject bounding box with invalid coordinates', () => {
            const bbox = { x: -0.1, y: 0.2, width: 0.3, height: 0.4 };
            expect(validateBoundingBox(bbox)).toBe(false);
        });

        it('should reject bounding box that exceeds boundaries', () => {
            const bbox = { x: 0.8, y: 0.8, width: 0.5, height: 0.5 };
            expect(validateBoundingBox(bbox)).toBe(false);
        });
    });

    describe('validateImageFile', () => {
        it('should validate correct image file', () => {
            const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
            const result = validateImageFile(file);
            expect(result.valid).toBe(true);
        });

        it('should reject non-image file', () => {
            const file = new File([''], 'test.txt', { type: 'text/plain' });
            const result = validateImageFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Invalid file type');
        });
    });

    describe('formatRelativeTime', () => {
        it('should format recent time correctly', () => {
            const now = new Date();
            const result = formatRelativeTime(now);
            expect(result).toBe('Just now');
        });

        it('should format hours correctly', () => {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const result = formatRelativeTime(twoHoursAgo);
            expect(result).toBe('2h ago');
        });
    });
});