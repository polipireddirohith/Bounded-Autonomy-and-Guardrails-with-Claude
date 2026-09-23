import { describe, it, expect, vi } from 'vitest';
import {
  withRetry,
  withTimeout,
  ReviewError,
  ErrorCodes,
  RateLimiter
} from '../src/utils/index.js';

describe('Production Utilities Tests', () => {
  describe('withRetry', () => {
    it('returns result when operation succeeds on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and returns result on eventual success', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('transient 1'))
        .mockRejectedValueOnce(new Error('transient 2'))
        .mockResolvedValue('recovered');

      const result = await withRetry(fn, 3, 10);
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws ReviewError with RETRY_EXHAUSTED when retries run out', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('permanent error'));

      await expect(withRetry(fn, 3, 10)).rejects.toThrow(ReviewError);
      try {
        await withRetry(fn, 3, 10);
      } catch (err: any) {
        expect(err.code).toBe(ErrorCodes.RETRY_EXHAUSTED);
      }
    });
  });

  describe('withTimeout', () => {
    it('returns result when operation completes within timeout', async () => {
      const fastFn = async () => {
        await new Promise((r) => setTimeout(r, 20));
        return 'completed';
      };

      const result = await withTimeout(fastFn, 200, 'Custom timeout');
      expect(result).toBe('completed');
    });

    it('throws ReviewError with AGENT_TIMEOUT when operation takes too long', async () => {
      const slowFn = () =>
        new Promise((resolve) => setTimeout(resolve, 500));

      await expect(withTimeout(slowFn, 50, 'Timeout reached')).rejects.toThrow(
        ReviewError
      );
      try {
        await withTimeout(slowFn, 50, 'Timeout reached');
      } catch (err: any) {
        expect(err.code).toBe(ErrorCodes.AGENT_TIMEOUT);
      }
    });
  });

  describe('RateLimiter', () => {
    it('initializes with default and custom configurations', () => {
      const limiter = new RateLimiter({
        maxRequestsPerMinute: 10,
        maxTokensPerMinute: 5000,
        maxConcurrent: 2
      });

      const status = limiter.getStatus();
      expect(status.activeRequests).toBe(0);
      expect(status.availableRequests).toBe(10);
      expect(status.availableTokens).toBe(5000);
    });

    it('manages concurrent requests and sliding window tracking', async () => {
      const limiter = new RateLimiter({
        maxRequestsPerMinute: 5,
        maxTokensPerMinute: 1000,
        maxConcurrent: 2
      });

      expect(limiter.canProceed(100)).toBe(true);
      await limiter.acquire(200);

      const status1 = limiter.getStatus();
      expect(status1.activeRequests).toBe(1);
      expect(status1.requestsInWindow).toBe(1);
      expect(status1.tokensInWindow).toBe(200);

      limiter.release();
      const status2 = limiter.getStatus();
      expect(status2.activeRequests).toBe(0);
    });

    it('denies canProceed when token limit would be exceeded', async () => {
      const limiter = new RateLimiter({
        maxRequestsPerMinute: 10,
        maxTokensPerMinute: 500,
        maxConcurrent: 5
      });

      await limiter.acquire(400);
      limiter.release();

      // Next request of 200 tokens would exceed 500 in window
      expect(limiter.canProceed(200)).toBe(false);
      // But a request of 50 tokens can proceed
      expect(limiter.canProceed(50)).toBe(true);
    });
  });
});
