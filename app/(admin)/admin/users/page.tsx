import { db } from '@/lib/db'
import { getMonthlyUsage } from '@/lib/usage'
import { UserTable } from '@/components/admin/UserTable'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const users = await db.user.findMany({ orderBy: { createdAt: 'asc' } })

  const usersWithUsage = await Promise.all(
    users.map(async (user) => ({
      ...user,
      charactersThisMonth: await getMonthlyUsage(user.id),
    })),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Approve, revoke, and cap team members.</p>
      </div>
      <UserTable users={usersWithUsage} />
    </div>
  )
}
