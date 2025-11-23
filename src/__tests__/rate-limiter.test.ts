/**
 * Rate Limiter Tests
 */

import {
    checkRateLimit,
    RateLimitPresets,
    resetRateLimit,
    getRateLimitIdentifier,
    checkMultipleRateLimits
} from '../lib/rate-limiter';

describe('Rate Limiter', () => {
    beforeEach(() => {
        // Reset rate limits before each test
        resetRateLimit('test-user');
        resetRateLimit('test-ip');
    });

    describe('Basic Rate Limiting', () => {
        it('should allow requests within limit', () => {
            const config = {
                windowMs: 60000, // 1 minute
                maxRequests: 3,
                message: 'Test limit exceeded'
            };

            const result1 = checkRateLimit('test-user', config);
            expect(result1.success).toBe(true);
            expect(result1.remaining).toBe(2);

            const result2 = checkRateLimit('test-user', config);
            expect(result2.success).toBe(true);
            expect(result2.remaining).toBe(1);

            const result3 = checkRateLimit('test-user', config);
            expect(result3.success).toBe(true);
            expect(result3.remaining).toBe(0);
        });

        it('should block requests exceeding limit', () => {
            const config = {
                windowMs: 60000,
                maxRequests: 2,
                message: 'Test limit exceeded'
            };

            checkRateLimit('test-user', config);
            checkRateLimit('test-user', config);

            const result = checkRateLimit('test-user', config);
            expect(result.success).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.retryAfter).toBeGreaterThan(0);
        });

        it('should provide correct rate limit information', () => {
            const config = {
                windowMs: 60000,
                maxRequests: 5,
                message: 'Test limit'
            };

            const result = checkRateLimit('test-user', config);
            expect(result.limit).toBe(5);
            expect(result.remaining).toBe(4);
            expect(result.reset).toBeGreaterThan(Date.now());
        });
    });

    describe('Sliding Window', () => {
        it('should use sliding window algorithm', async () => {
            const config = {
                windowMs: 1000, // 1 second
                maxRequests: 2,
                message: 'Test limit'
            };

            // Use up the limit
            checkRateLimit('test-user', config);
            checkRateLimit('test-user', config);

            // Should be blocked
            let result = checkRateLimit('test-user', config);
            expect(result.success).toBe(false);

            // Wait for window to pass
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should be allowed again
            result = checkRateLimit('test-user', config);
            expect(result.success).toBe(true);
        });
    });

    describe('Multiple Identifiers', () => {
        it('should track different identifiers separately', () => {
            const config = {
                windowMs: 60000,
                maxRequests: 2,
                message: 'Test limit'
            };

            checkRateLimit('user1', config);
            checkRateLimit('user1', config);

            // user1 should be blocked
            const result1 = checkRateLimit('user1', config);
            expect(result1.success).toBe(false);

            // user2 should still have capacity
            const result2 = checkRateLimit('user2', config);
            expect(result2.success).toBe(true);
        });
    });

    describe('getRateLimitIdentifier', () => {
        it('should prefer user ID over IP', () => {
            const identifier = getRateLimitIdentifier('user123', '192.168.1.1');
            expect(identifier).toBe('user:user123');
        });

        it('should use IP when user ID is not available', () => {
            const identifier = getRateLimitIdentifier(null, '192.168.1.1');
            expect(identifier).toBe('ip:192.168.1.1');
        });

        it('should use anonymous when neither is available', () => {
            const identifier = getRateLimitIdentifier(null, null);
            expect(identifier).toBe('anonymous');
        });
    });

    describe('Preset Configurations', () => {
        it('should have GEMINI_ANALYSIS preset', () => {
            expect(RateLimitPresets.GEMINI_ANALYSIS).toBeDefined();
            expect(RateLimitPresets.GEMINI_ANALYSIS.windowMs).toBe(60000); // 1 minute
            expect(RateLimitPresets.GEMINI_ANALYSIS.maxRequests).toBeGreaterThan(0);
        });

        it('should have GEMINI_DAILY preset', () => {
            expect(RateLimitPresets.GEMINI_DAILY).toBeDefined();
            expect(RateLimitPresets.GEMINI_DAILY.windowMs).toBe(86400000); // 24 hours
        });

        it('should have API_GENERAL preset', () => {
            expect(RateLimitPresets.API_GENERAL).toBeDefined();
        });

        it('should have AUTH preset', () => {
            expect(RateLimitPresets.AUTH).toBeDefined();
        });
    });

    describe('Multiple Rate Limits', () => {
        it('should check multiple limits and return first failure', () => {
            const configs = [
                {
                    name: 'minute',
                    config: { windowMs: 60000, maxRequests: 5, message: 'Per minute limit' }
                },
                {
                    name: 'daily',
                    config: { windowMs: 86400000, maxRequests: 100, message: 'Daily limit' }
                }
            ];

            // Use up the minute limit
            for (let i = 0; i < 5; i++) {
                checkRateLimit('test-user:minute', configs[0].config);
            }

            // Should fail on minute limit
            const failed = checkMultipleRateLimits('test-user', configs);
            expect(failed).not.toBeNull();
            expect(failed?.name).toBe('minute');
        });

        it('should return null when all limits pass', () => {
            const configs = [
                {
                    name: 'minute',
                    config: { windowMs: 60000, maxRequests: 5, message: 'Per minute limit' }
                },
                {
                    name: 'daily',
                    config: { windowMs: 86400000, maxRequests: 100, message: 'Daily limit' }
                }
            ];

            const failed = checkMultipleRateLimits('test-user', configs);
            expect(failed).toBeNull();
        });
    });

    describe('Reset Functionality', () => {
        it('should reset rate limit for identifier', () => {
            const config = {
                windowMs: 60000,
                maxRequests: 2,
                message: 'Test limit'
            };

            // Use up the limit
            checkRateLimit('test-user', config);
            checkRateLimit('test-user', config);

            // Should be blocked
            let result = checkRateLimit('test-user', config);
            expect(result.success).toBe(false);

            // Reset
            resetRateLimit('test-user');

            // Should be allowed again
            result = checkRateLimit('test-user', config);
            expect(result.success).toBe(true);
        });
    });
});
