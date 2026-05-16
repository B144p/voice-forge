import { NextResponse } from 'next/server'
import { requireAdmin, errorResponse } from '@/lib/authz'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d })()
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date()

    // Total characters and cost this period
    const totals = await db.usageLog.aggregate({
      where: { createdAt: { gte: from, lte: to } },
      _sum: { characters: true },
    })
    const totalChars = totals._sum.characters ?? 0
    const totalCostUsd = +(totalChars * 0.0001).toFixed(4)

    // Top users by consumption
    const topUsers = await db.usageLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: from, lte: to } },
      _sum: { characters: true },
      orderBy: { _sum: { characters: 'desc' } },
      take: 10,
    })

    const topUsersWithEmail = await Promise.all(
      topUsers.map(async (row) => {
        const user = await db.user.findUnique({
          where: { id: row.userId },
          select: { email: true, name: true },
        })
        return {
          userId: row.userId,
          email: user?.email ?? 'unknown',
          name: user?.name,
          characters: row._sum.characters ?? 0,
        }
      }),
    )

    // 30-day daily trend
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const rawLogs = await db.usageLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { characters: true, createdAt: true },
    })

    const dailyMap = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo)
      d.setDate(d.getDate() + i)
      dailyMap.set(d.toISOString().slice(0, 10), 0)
    }
    for (const log of rawLogs) {
      const day = log.createdAt.toISOString().slice(0, 10)
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + log.characters)
    }
    const dailyTrend = Array.from(dailyMap.entries()).map(([date, characters]) => ({ date, characters }))

    return NextResponse.json({ totalChars, totalCostUsd, topUsers: topUsersWithEmail, dailyTrend })
  } catch (err) {
    return errorResponse(err)
  }
}
