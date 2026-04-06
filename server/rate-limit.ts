/**
 * Simple in-memory sliding-window rate limiter for API endpoints.
 * Designed for single-process deployments (Expo dev server / small VPS).
 * For multi-instance production, swap to Redis-backed implementation.
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name)!;
}

/**
 * Check and consume a rate-limit token.
 * Returns { allowed, remaining, retryAfterMs }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  storeName = "default",
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const store = getStore(storeName);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Prune timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(retryAfterMs, 0),
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

// ── Pre-configured limiters for PeakPulse AI endpoints ──

/** AI chat / coach endpoints: 20 requests per minute per user */
export const AI_CHAT_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60_000,
};

/** AI plan generation: 5 requests per minute per user */
export const AI_PLAN_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60_000,
};

/** AI body scan analysis: 3 requests per minute per user */
export const AI_SCAN_LIMIT: RateLimitConfig = {
  maxRequests: 3,
  windowMs: 60_000,
};

/** General API: 120 requests per minute per user */
export const GENERAL_API_LIMIT: RateLimitConfig = {
  maxRequests: 120,
  windowMs: 60_000,
};

/**
 * Express-style middleware helper.
 * Usage: app.use('/api/ai', rateLimitMiddleware(AI_CHAT_LIMIT))
 */
export function rateLimitMiddleware(config: RateLimitConfig, storeName?: string) {
  return (req: any, res: any, next: any) => {
    // Use userId from auth context, fall back to IP
    const key = req.userId ?? req.ip ?? "anonymous";
    const result = checkRateLimit(key, config, storeName);

    res.setHeader("X-RateLimit-Limit", config.maxRequests);
    res.setHeader("X-RateLimit-Remaining", result.remaining);

    if (!result.allowed) {
      res.setHeader("Retry-After", Math.ceil(result.retryAfterMs / 1000));
      return res.status(429).json({
        error: "Too many requests",
        retryAfterMs: result.retryAfterMs,
      });
    }

    next();
  };
}

/**
 * tRPC-compatible rate limit check.
 * Throws TRPCError if limit exceeded.
 * Usage inside a tRPC procedure:
 *   assertRateLimit(ctx.userId, AI_CHAT_LIMIT, 'ai-chat');
 */
export function assertRateLimit(
  userId: string,
  config: RateLimitConfig,
  storeName?: string,
) {
  const result = checkRateLimit(userId, config, storeName);
  if (!result.allowed) {
    // Import dynamically to avoid coupling this module to tRPC
    const { TRPCError } = require("@trpc/server");
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${Math.ceil(result.retryAfterMs / 1000)}s`,
    });
  }
  return result;
}

// ── Periodic cleanup to prevent memory leaks ──
const CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes

setInterval(() => {
  const now = Date.now();
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      // Remove entries with no recent timestamps
      if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < now - 300_000) {
        store.delete(key);
      }
    }
  }
}, CLEANUP_INTERVAL);
