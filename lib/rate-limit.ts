import { NextResponse } from 'next/server'

/** Checks rate limit: 60 req/min per userId. Returns 429 response if exceeded, null if ok. */
export async function checkRateLimit(userId: string): Promise<NextResponse | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: false,
  })

  const { success } = await ratelimit.limit(userId)
  if (!success) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again in a minute.' } },
      { status: 429 },
    )
  }
  return null
}
