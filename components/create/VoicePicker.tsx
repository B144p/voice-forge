'use client'

import { useState, useRef } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Play, Square } from 'lucide-react'
import type { VoiceOption } from '@/types'

interface VoicePickerProps {
  voices: VoiceOption[]
  value: string
  onChange: (voiceId: string, voiceName: string) => void
}

export function VoicePicker({ voices, value, onChange }: VoicePickerProps) {
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const selectedVoice = voices.find((v) => v.voiceId === value)

  function handleSelect(voiceId: string) {
    const voice = voices.find((v) => v.voiceId === voiceId)
    if (voice) onChange(voice.voiceId, voice.name)
  }

  function handlePreview(voice: VoiceOption) {
    if (!voice.previewUrl) return

    if (playing === voice.voiceId) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const audio = new Audio(voice.previewUrl)
    audioRef.current = audio
    audio.play()
    setPlaying(voice.voiceId)
    audio.onended = () => setPlaying(null)
    audio.onerror = () => setPlaying(null)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={handleSelect}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a voice…" />
        </SelectTrigger>
        <SelectContent>
          {voices.map((voice) => (
            <SelectItem key={voice.voiceId} value={voice.voiceId}>
              {voice.name}
              {voice.language ? ` (${voice.language})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedVoice?.previewUrl && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handlePreview(selectedVoice)}
          title={playing === selectedVoice.voiceId ? 'Stop preview' : 'Preview voice'}
        >
          {playing === selectedVoice.voiceId ? (
            <Square className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  )
}
