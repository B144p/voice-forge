'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ItemRow } from '@/components/sets/ItemRow'
import { useToast } from '@/hooks/use-toast'
import { Download, Archive, Loader2 } from 'lucide-react'
import type { SpeechSet, SpeechItem } from '@prisma/client'

type SetWithItems = SpeechSet & { items: SpeechItem[]; job: { itemsTotal: number; itemsCompleted: number; itemsFailed: number } | null }

interface SetViewProps {
  initialSet: SetWithItems
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'secondary',
  processing: 'outline',
  completed: 'default',
  partial: 'secondary',
  failed: 'destructive',
}

export function SetView({ initialSet }: SetViewProps) {
  const { toast } = useToast()
  const [set, setSet] = useState(initialSet)
  const [items, setItems] = useState(initialSet.items)
  const [polling, setPolling] = useState(
    initialSet.status === 'pending' || initialSet.status === 'processing',
  )

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/sets/${set.id}/status`)
    if (!res.ok) return
    const data = await res.json()
    setSet((prev) => ({ ...prev, status: data.status, job: data }))
    setItems((prev) =>
      prev.map((item) => {
        const updated = data.items.find((i: { id: string }) => i.id === item.id)
        return updated ? { ...item, ...updated } : item
      }),
    )
    if (data.status !== 'pending' && data.status !== 'processing') {
      setPolling(false)
    }
  }, [set.id])

  useEffect(() => {
    if (!polling) return
    const id = setInterval(fetchStatus, 2000)
    return () => clearInterval(id)
  }, [polling, fetchStatus])

  const allComplete = set.status === 'completed'
  const progressPct =
    set.job && set.job.itemsTotal > 0
      ? Math.round(((set.job.itemsCompleted + set.job.itemsFailed) / set.job.itemsTotal) * 100)
      : 0

  async function downloadCombined() {
    window.location.href = `/api/sets/${set.id}/download/combined`
  }

  async function downloadZip() {
    window.location.href = `/api/sets/${set.id}/download/zip`
  }

  function handleRegenerated() {
    fetchStatus()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{set.title}</h1>
          <p className="text-sm text-muted-foreground">
            Voice: {set.voiceName} · {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Badge variant={(STATUS_COLOR[set.status] as 'default' | 'secondary' | 'destructive' | 'outline') ?? 'secondary'}>
          {set.status}
        </Badge>
      </div>

      {(set.status === 'pending' || set.status === 'processing') && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating… {set.job?.itemsCompleted ?? 0} / {set.job?.itemsTotal ?? items.length} done
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          disabled={!allComplete}
          onClick={downloadCombined}
          title={allComplete ? 'Download combined MP3' : 'Available when all items are complete'}
        >
          <Download className="h-4 w-4" />
          Download Combined MP3
        </Button>
        <Button
          variant="outline"
          disabled={!allComplete}
          onClick={downloadZip}
          title={allComplete ? 'Download ZIP of all MP3s' : 'Available when all items are complete'}
        >
          <Archive className="h-4 w-4" />
          Download ZIP
        </Button>
      </div>

      <div className="space-y-3">
        {items
          .slice()
          .sort((a, b) => a.index - b.index)
          .map((item) => (
            <ItemRow
              key={item.id}
              setId={set.id}
              item={item}
              onRegenerated={handleRegenerated}
            />
          ))}
      </div>
    </div>
  )
}
