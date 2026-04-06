import "server-only";

import { headers } from "next/headers";

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowMs: number;
  key?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_STORE_SYMBOL = Symbol.for("pulse.rate-limit-store");

function getRateLimitStore() {
  const globalStore = globalThis as typeof globalThis & {
    [RATE_LIMIT_STORE_SYMBOL]?: Map<string, RateLimitEntry>;
  };

  if (!globalStore[RATE_LIMIT_STORE_SYMBOL]) {
    globalStore[RATE_LIMIT_STORE_SYMBOL] = new Map<string, RateLimitEntry>();
  }

  return globalStore[RATE_LIMIT_STORE_SYMBOL];
}

async function getClientIdentifier() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = requestHeaders.get("x-real-ip");
  const userAgent = requestHeaders.get("user-agent") ?? "unknown-agent";

  return `${forwardedFor ?? realIp ?? "unknown-ip"}:${userAgent}`;
}

export async function enforceRateLimit(options: RateLimitOptions) {
  const store = getRateLimitStore();
  const identifier = options.key ?? (await getClientIdentifier());
  const bucketKey = `${options.scope}:${identifier}`;
  const now = Date.now();
  const existing = store.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    store.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt: now + options.windowMs,
    } as const;
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    } as const;
  }

  existing.count += 1;
  store.set(bucketKey, existing);

  return {
    allowed: true,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  } as const;
}
