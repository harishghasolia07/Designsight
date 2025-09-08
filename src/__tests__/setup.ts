// Jest DOM setup
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
        prefetch: jest.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/'
}));

// Mock Next.js image - simple mock without JSX
jest.mock('next/image', () => 'img');

// Mock file upload
Object.defineProperty(window, 'File', {
    value: class MockFile {
        name: string;
        type: string;
        size: number;

        constructor(chunks: any[], filename: string, options: any = {}) {
            this.name = filename;
            this.type = options.type || '';
            this.size = options.size || 0;
        }
    }
});

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.GEMINI_API_KEY = 'test-key';
process.env.NEXTAUTH_SECRET = 'test-secret';