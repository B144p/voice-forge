'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { VoicePicker } from '@/components/create/VoicePicker'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { VoiceOption } from '@/types'

const MAX_ITEMS = 30
const MAX_CHARS_PER_ITEM = 5000

interface SetBuilderProps {
  voices: VoiceOption[]
}

export function SetBuilder({ voices }: SetBuilderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [voiceId, setVoiceId] = useState('')
  const [voiceName, setVoiceName] = useState('')
  const [items, setItems] = useState([''])
  const [loading, setLoading] = useState(false)

  function addItem() {
    if (items.length < MAX_ITEMS) setItems((prev) => [...prev, ''])
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, value: string) {
    setItems((prev) => prev.map((v, idx) => (idx === i ? value : v)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!voiceId) {
      toast({ variant: 'destructive', title: 'Please select a voice.' })
      return
    }

    const filledItems = items.filter((t) => t.trim().length > 0)
    if (filledItems.length === 0) {
      toast({ variant: 'destructive', title: 'Add at least one sentence.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || `${voiceName} — ${new Date().toLocaleDateString()}`,
          voiceId,
          items: filledItems.map((text) => ({ text })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', title: data.error?.message ?? 'Generation failed.' })
        return
      }

      router.push(`/sets/${data.id}`)
    } catch {
      toast({ variant: 'destructive', title: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. HSK4 Lesson 12 — Travel vocabulary"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label>Voice</Label>
        <VoicePicker
          voices={voices}
          value={voiceId}
          onChange={(id, name) => {
            setVoiceId(id)
            setVoiceName(name)
          }}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Sentences</Label>
          <span className="text-sm text-muted-foreground">
            {items.length} / {MAX_ITEMS}
          </span>
        </div>

        {items.map((text, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-2 w-6 shrink-0 text-right text-sm text-muted-foreground">
              {i + 1}
            </span>
            <Textarea
              value={text}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder="Enter sentence…"
              className="min-h-[60px] whitespace-pre-wrap resize-y"
              maxLength={MAX_CHARS_PER_ITEM}
            />
            <div className="mt-1.5 flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">
                {text.length}/{MAX_CHARS_PER_ITEM}
              </span>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(i)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {items.length < MAX_ITEMS && (
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Add sentence
          </Button>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full sm:w-auto">
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            Generating…
          </>
        ) : (
          'Generate'
        )}
      </Button>
    </form>
  )
}
