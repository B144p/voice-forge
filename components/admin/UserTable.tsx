'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import type { User } from '@prisma/client'

interface UserWithUsage extends User {
  charactersThisMonth: number
}

export function UserTable({ users: initialUsers }: { users: UserWithUsage[] }) {
  const { toast } = useToast()
  const [users, setUsers] = useState(initialUsers)
  const [capInputs, setCapInputs] = useState<Record<string, string>>({})

  async function handleAction(userId: string, action: 'approve' | 'revoke') {
    const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: 'POST' })
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Action failed' })
      return
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: action === 'approve' ? 'approved' : 'revoked' } : u,
      ),
    )
    toast({ title: `User ${action}d` })
  }

  async function handleSetCap(userId: string) {
    const raw = capInputs[userId]
    const monthlyCharLimit = raw === '' ? null : parseInt(raw, 10)
    if (raw !== '' && isNaN(monthlyCharLimit!)) return

    const res = await fetch(`/api/admin/users/${userId}/limit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyCharLimit }),
    })
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Failed to update cap' })
      return
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, monthlyCharLimit } : u)))
    toast({ title: 'Cap updated' })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Last Login</TableHead>
          <TableHead>Chars (this month)</TableHead>
          <TableHead>Monthly Cap</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="font-medium">{user.name ?? '—'}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  user.status === 'approved'
                    ? 'default'
                    : user.status === 'revoked'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {user.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{user.role}</Badge>
            </TableCell>
            <TableCell>
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}
            </TableCell>
            <TableCell>{user.charactersThisMonth.toLocaleString()}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={user.monthlyCharLimit?.toString() ?? 'Unlimited'}
                  className="w-28"
                  value={capInputs[user.id] ?? ''}
                  onChange={(e) =>
                    setCapInputs((prev) => ({ ...prev, [user.id]: e.target.value }))
                  }
                />
                <Button size="sm" variant="outline" onClick={() => handleSetCap(user.id)}>
                  Set
                </Button>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                {user.status !== 'approved' && (
                  <Button size="sm" onClick={() => handleAction(user.id, 'approve')}>
                    Approve
                  </Button>
                )}
                {user.status !== 'revoked' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleAction(user.id, 'revoke')}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
