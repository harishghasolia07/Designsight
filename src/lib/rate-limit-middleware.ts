/**
 * Rate Limiting Middleware for Next.js API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
    checkRateLimit,
    createRateLimitHeaders,
    getRateLimitIdentifier,
    getClientIp,
    RateLimitConfig,
    checkMultipleRateLimits
} from './rate-limiter';

export interface RateLimitOptions {
    config: RateLimitConfig;
    identifier?: string; // Custom identifier (optional)
    skipAuthentication?: boolean; // Skip checking auth (for public endpoints)
}

/**
 * Rate limit middleware for API routes
 * Returns a NextResponse with rate limit error if exceeded, null otherwise
 */
export async function rateLimitMiddleware(
    request: NextRequest,
    options: RateLimitOptions
): Promise<NextResponse | null> {
    try {
        let identifier: string;

        if (options.identifier) {
            // Use custom identifier if provided
            identifier = options.identifier;
        } else {
            // Get user ID from Clerk auth
            let userId: string | null = null;
            
            if (!options.skipAuthentication) {
                try {
                    const { userId: authUserId } = await auth();
                    userId = authUserId;
                } catch (error) {
                    console.warn('Auth check failed in rate limiter:', error);
                }
            }

            // Get IP address as fallback
            const ip = getClientIp(request.headers);
            
            identifier = getRateLimitIdentifier(userId, ip);
        }

        // Check rate limit
        const result = checkRateLimit(identifier, options.config);

        // Add rate limit headers
        const headers = createRateLimitHeaders(result);

        if (!result.success) {
            // Rate limit exceeded
            return NextResponse.json(
                {
                    error: options.config.message || 'Rate limit exceeded',
                    limit: result.limit,
                    remaining: result.remaining,
                    reset: result.reset,
                    retryAfter: result.retryAfter
                },
                {
                    status: 429,
                    headers
                }
            );
        }

        // Rate limit passed - headers will be added by the caller if needed
        return null;
    } catch (error) {
        console.error('Rate limit middleware error:', error);
        // Don't block request on rate limiter errors
        return null;
    }
}

/**
 * Check multiple rate limits (e.g., per-minute AND per-day)
 * Returns error response if any limit is exceeded
 */
export async function checkMultipleRateLimitsMiddleware(
    request: NextRequest,
    configs: { name: string; config: RateLimitConfig }[],
    skipAuthentication: boolean = false
): Promise<NextResponse | null> {
    try {
        // Get user ID from Clerk auth
        let userId: string | null = null;
        
        if (!skipAuthentication) {
            try {
                const { userId: authUserId } = await auth();
                userId = authUserId;
            } catch (error) {
                console.warn('Auth check failed in rate limiter:', error);
            }
        }

        // Get IP address as fallback
        const ip = getClientIp(request.headers);
        const identifier = getRateLimitIdentifier(userId, ip);

        // Check all rate limits
        const failedLimit = checkMultipleRateLimits(identifier, configs);

        if (failedLimit) {
            const headers = createRateLimitHeaders(failedLimit.result);
            const failedConfig = configs.find(c => c.name === failedLimit.name);
            
            return NextResponse.json(
                {
                    error: failedConfig?.config.message || 'Rate limit exceeded',
                    limitType: failedLimit.name,
                    limit: failedLimit.result.limit,
                    remaining: failedLimit.result.remaining,
                    reset: failedLimit.result.reset,
                    retryAfter: failedLimit.result.retryAfter
                },
                {
                    status: 429,
                    headers
                }
            );
        }

        return null;
    } catch (error) {
        console.error('Multiple rate limit check error:', error);
        // Don't block request on rate limiter errors
        return null;
    }
}

/**
 * Helper to add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
    response: NextResponse,
    limit: number,
    remaining: number,
    reset: number
): NextResponse {
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());
    return response;
}
