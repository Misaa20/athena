import { NextResponse } from "next/server";

type RateLimitOptions = {
  name: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function cleanup(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimit(req: Request, options: RateLimitOptions) {
  const now = Date.now();
  cleanup(now);

  const key = `${options.name}:${clientIp(req)}`;
  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + options.windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count <= options.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "rate_limited", retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(bucket.resetAt / 1000)),
      },
    },
  );
}
