/**
 * Rate Limiter for protecting Gemini API and other endpoints
 * Implements per-user and per-IP rate limiting with sliding window
 */

export interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Maximum requests per window
    message?: string; // Custom error message
}

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number; // Timestamp when the window resets
    retryAfter?: number; // Seconds to wait before retrying
}

interface RequestLog {
    count: number;
    resetTime: number;
    requests: number[]; // Timestamps of requests for sliding window
}

class RateLimiterStore {
    private store: Map<string, RequestLog> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, log] of this.store.entries()) {
            if (log.resetTime < now) {
                this.store.delete(key);
            }
        }
    }

    check(key: string, config: RateLimitConfig): RateLimitResult {
        const now = Date.now();
        let log = this.store.get(key);

        // Initialize or reset if window expired
        if (!log || log.resetTime <= now) {
            log = {
                count: 0,
                resetTime: now + config.windowMs,
                requests: []
            };
            this.store.set(key, log);
        }

        // Sliding window: Remove requests outside the current window
        log.requests = log.requests.filter(timestamp => timestamp > now - config.windowMs);

        // Check if limit exceeded
        const currentCount = log.requests.length;
        const remaining = Math.max(0, config.maxRequests - currentCount);
        
        if (currentCount >= config.maxRequests) {
            // Calculate when the oldest request will expire
            const oldestRequest = log.requests[0];
            const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000);

            return {
                success: false,
                limit: config.maxRequests,
                remaining: 0,
                reset: log.resetTime,
                retryAfter
            };
        }

        // Record this request
        log.requests.push(now);
        log.count = log.requests.length;
        this.store.set(key, log);

        return {
            success: true,
            limit: config.maxRequests,
            remaining: remaining - 1, // -1 for the current request
            reset: log.resetTime
        };
    }

    reset(key: string) {
        this.store.delete(key);
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        this.store.clear();
    }
}

// Global store instance
const globalStore = new RateLimiterStore();

/**
 * Default rate limit configurations
 */
export const RateLimitPresets = {
    // For Gemini API image analysis - strict limits
    GEMINI_ANALYSIS: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_GEMINI_PER_MINUTE || '5'), // 5 requests per minute per user
        message: 'Too many image analysis requests. Please wait before uploading more images.'
    },
    
    // For general API endpoints - moderate limits
    API_GENERAL: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_API_PER_15MIN || '100'),
        message: 'Too many requests. Please slow down.'
    },
    
    // For authentication endpoints - strict limits
    AUTH: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_PER_15MIN || '5'),
        message: 'Too many authentication attempts. Please try again later.'
    },

    // Daily limit for Gemini API to prevent quota exhaustion
    GEMINI_DAILY: {
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        maxRequests: parseInt(process.env.RATE_LIMIT_GEMINI_PER_DAY || '100'), // 100 requests per day per user
        message: 'Daily image analysis limit reached. Please try again tomorrow.'
    }
};

/**
 * Check rate limit for a given identifier (user ID, IP, etc.)
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    return globalStore.check(identifier, config);
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or admin overrides
 */
export function resetRateLimit(identifier: string): void {
    globalStore.reset(identifier);
}

/**
 * Create rate limit headers for HTTP responses
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString()
    };

    if (result.retryAfter) {
        headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
}

/**
 * Get unique identifier for rate limiting
 * Uses user ID if available, falls back to IP address
 */
export function getRateLimitIdentifier(
    userId?: string | null,
    ip?: string | null
): string {
    if (userId) {
        return `user:${userId}`;
    }
    if (ip) {
        return `ip:${ip}`;
    }
    return 'anonymous';
}

/**
 * Extract IP address from request headers
 */
export function getClientIp(headers: Headers): string | null {
    // Check common headers for IP address
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    return null;
}

/**
 * Middleware helper to check multiple rate limits
 * Returns the first failed limit or null if all pass
 */
export function checkMultipleRateLimits(
    identifier: string,
    configs: { name: string; config: RateLimitConfig }[]
): { name: string; result: RateLimitResult } | null {
    for (const { name, config } of configs) {
        const result = checkRateLimit(`${identifier}:${name}`, config);
        if (!result.success) {
            return { name, result };
        }
    }
    return null;
}
