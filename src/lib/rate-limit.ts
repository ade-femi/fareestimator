import 'server-only';
import { getEnv } from '@/lib/env';

/**
 * Fixed-window rate limiter keyed by client IP.
 *
 * Deliberately dependency-free and in-memory: on Vercel's free tier a single
 * region handles the traffic, and this stops casual abuse of the Google quota.
 * For multi-region or high traffic, replace `hit()` with an Upstash Redis
 * INCR + EXPIRE — the call sites do not need to change.
 */

interface Window {
  count: number;
  resetAt: number;
}

const globalForLimiter = globalThis as unknown as {
  __tfe_rate_limit?: Map<string, Window>;
};

const buckets = (globalForLimiter.__tfe_rate_limit ??= new Map<string, Window>());

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

/** Occasionally drops expired windows so the map cannot grow without bound. */
function sweep(now: number): void {
  if (buckets.size < 5000) return;
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(
  identifier: string,
  options?: { limit?: number; windowSeconds?: number },
): RateLimitResult {
  const env = getEnv();
  const limit = options?.limit ?? env.RATE_LIMIT_MAX_REQUESTS;
  const windowMs = (options?.windowSeconds ?? env.RATE_LIMIT_WINDOW_SECONDS) * 1000;

  const now = Date.now();
  sweep(now);

  const existing = buckets.get(identifier);

  if (!existing || existing.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000);

  return {
    success: existing.count <= limit,
    limit,
    remaining,
    retryAfter,
  };
}

/**
 * Best-effort client IP. Vercel sets `x-forwarded-for`; the left-most entry is
 * the original client. Falls back to a constant so a missing header degrades to
 * a shared bucket rather than to no limiting at all.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'unknown-client';
}
