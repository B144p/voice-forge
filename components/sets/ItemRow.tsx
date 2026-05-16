'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, RefreshCw, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { ItemStatus } from '@/types'

interface ItemRowProps {
  setId: string
  item: {
    id: string
    index: number
    text: string
    status: ItemStatus
    characterCount: number
    errorMessage?: string | null
    regenerationCount: number
  }
  onRegenerated?: (itemId: string) => void
}

const STATUS_BADGE: Record<ItemStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'outline' },
  completed: { label: 'Done', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export function ItemRow({ setId, item, onRegenerated }: ItemRowProps) {
  const { toast } = useToast()
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  async function loadAudio() {
    if (audioUrl || item.status !== 'completed') return
    setLoadingAudio(true)
    try {
      const res = await fetch(`/api/sets/${setId}/items/${item.id}/url`)
      const data = await res.json()
      if (res.ok) setAudioUrl(data.url)
    } finally {
      setLoadingAudio(false)
    }
  }

  async function handleDownload() {
    await loadAudio()
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `${String(item.index + 1).padStart(2, '0')}.mp3`
    a.click()
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const res = await fetch(`/api/sets/${setId}/items/${item.id}/regenerate`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        toast({ variant: 'destructive', title: data.error?.message ?? 'Regeneration failed.' })
        return
      }
      setAudioUrl(null)
      onRegenerated?.(item.id)
      toast({ title: 'Item regenerated.' })
    } finally {
      setRegenerating(false)
    }
  }

  const { label, variant } = STATUS_BADGE[item.status]

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-mono text-muted-foreground w-6 text-right">
            {item.index + 1}
          </span>
          <Badge variant={variant}>{label}</Badge>
        </div>
        <p className="text-sm whitespace-pre-wrap flex-1">{item.text}</p>
        <span className="text-xs text-muted-foreground shrink-0">{item.characterCount} chars</span>
      </div>

      {item.errorMessage && (
        <p className="text-xs text-destructive">{item.errorMessage}</p>
      )}

      {item.status === 'completed' && (
        <div className="flex items-center gap-2 pl-8">
          {audioUrl ? (
            <audio controls src={audioUrl} className="h-8 w-48" />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadAudio}
              disabled={loadingAudio}
            >
              {loadingAudio ? <Loader2 className="animate-spin h-3 w-3" /> : 'Load audio'}
            </Button>
          )}

          <Button type="button" variant="outline" size="icon" onClick={handleDownload} title="Download MP3">
            <Download className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRegenerate}
            disabled={regenerating}
            title="Regenerate"
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>

          {item.regenerationCount > 0 && (
            <span className="text-xs text-muted-foreground">
              Regenerated {item.regenerationCount}×
            </span>
          )}
        </div>
      )}

      {(item.status === 'failed') && (
        <div className="pl-8">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
