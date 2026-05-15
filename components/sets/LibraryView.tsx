'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SetStatus } from '@/types'

interface SetSummary {
  id: string
  title: string
  status: SetStatus
  itemCount: number
  voiceName: string
  createdAt: string
}

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'completed', 'partial', 'failed'] as const

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  processing: 'outline',
  pending: 'secondary',
  partial: 'secondary',
  failed: 'destructive',
}

export function LibraryView() {
  const [sets, setSets] = useState<SetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSets = useCallback(
    async (q: string, status: string, cursor?: string) => {
      setLoading(true)
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status !== 'all') params.set('status', status)
      if (cursor) params.set('cursor', cursor)

      const res = await fetch(`/api/sets?${params}`)
      if (!res.ok) return
      const data = await res.json()

      setSets((prev) => (cursor ? [...prev, ...data.items] : data.items))
      setNextCursor(data.nextCursor)
      setLoading(false)
    },
    [],
  )

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSets([])
      fetchSets(query, statusFilter)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, statusFilter, fetchSets])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Library</h1>
        <Button asChild size="sm">
          <Link href="/create">New Set</Link>
        </Button>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search by title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All statuses' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Voice</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && sets.length === 0
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : sets.map((set) => (
                <TableRow key={set.id}>
                  <TableCell>
                    <Link
                      href={`/sets/${set.id}`}
                      className="font-medium hover:underline"
                    >
                      {set.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{set.voiceName}</TableCell>
                  <TableCell>{set.itemCount}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[set.status] ?? 'secondary'}>{set.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(set.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
          {!loading && sets.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No sets found.{' '}
                <Link href="/create" className="underline">
                  Create one
                </Link>
                .
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {nextCursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchSets(query, statusFilter, nextCursor)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
