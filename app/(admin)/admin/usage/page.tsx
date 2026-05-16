import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UsageChart } from '@/components/admin/UsageChart'

export const dynamic = 'force-dynamic'

async function getUsageData() {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const totals = await db.usageLog.aggregate({
    where: { createdAt: { gte: start } },
    _sum: { characters: true },
  })
  const totalChars = totals._sum.characters ?? 0

  const topUsers = await db.usageLog.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: start } },
    _sum: { characters: true },
    orderBy: { _sum: { characters: 'desc' } },
    take: 10,
  })

  const usersWithEmail = await Promise.all(
    topUsers.map(async (row) => {
      const user = await db.user.findUnique({
        where: { id: row.userId },
        select: { email: true, name: true },
      })
      return { userId: row.userId, email: user?.email ?? 'unknown', name: user?.name, characters: row._sum.characters ?? 0 }
    }),
  )

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

  return { totalChars, totalCostUsd: +(totalChars * 0.0001).toFixed(4), topUsers: usersWithEmail, dailyTrend }
}

export default async function AdminUsagePage() {
  const { totalChars, totalCostUsd, topUsers, dailyTrend } = await getUsageData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usage Analytics</h1>
        <p className="text-muted-foreground">Current calendar month.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Characters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalChars.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totalCostUsd.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground mt-1">@ $0.0001 per character</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">30-Day Daily Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart data={dailyTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Users This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Characters</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No usage this month.
                  </TableCell>
                </TableRow>
              ) : (
                topUsers.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell>
                      <div className="font-medium">{u.name ?? '—'}</div>
                      <div className="text-sm text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>{u.characters.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
