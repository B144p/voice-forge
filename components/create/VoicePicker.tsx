'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Play, Square } from 'lucide-react'
import type { VoiceOption } from '@/types'

interface VoicePickerProps {
  voices: VoiceOption[]
  value: string
  onChange: (voiceId: string, voiceName: string) => void
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  tr: 'Turkish',
  uk: 'Ukrainian',
}

function langLabel(code: string) {
  return LANGUAGE_NAMES[code] ?? code.toUpperCase()
}

const LANGUAGES = Object.keys(LANGUAGE_NAMES)

export function VoicePicker({ voices: initialVoices, value, onChange }: VoicePickerProps) {
  const [playing, setPlaying] = useState<string | null>(null)
  const [langFilter, setLangFilter] = useState<string>('all')
  const [freeOnly, setFreeOnly] = useState(true)
  const [voices, setVoices] = useState<VoiceOption[]>(initialVoices)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (langFilter === 'all') {
      setVoices(initialVoices)
      return
    }
    setLoading(true)
    fetch(`/api/voices?language=${encodeURIComponent(langFilter)}`)
      .then((r) => r.json())
      .then((data) => setVoices(Array.isArray(data) ? data : initialVoices))
      .catch(() => setVoices(initialVoices))
      .finally(() => setLoading(false))
  }, [langFilter, initialVoices])

  const filtered = useMemo(() => {
    let list = langFilter === 'all' ? voices : voices.filter((v) => v.language === langFilter)
    if (freeOnly) list = list.filter((v) => v.category === 'premade')
    return list
  }, [voices, langFilter, freeOnly])

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
    if (audioRef.current) audioRef.current.pause()
    const audio = new Audio(voice.previewUrl)
    audioRef.current = audio
    audio.play()
    setPlaying(voice.voiceId)
    audio.onended = () => setPlaying(null)
    audio.onerror = () => setPlaying(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex cursor-pointer items-center gap-1.5 text-sm">
        <input
          type="checkbox"
          checked={freeOnly}
          onChange={(e) => setFreeOnly(e.target.checked)}
          className="cursor-pointer"
        />
        Free only
      </label>

      <Select value={langFilter} onValueChange={setLangFilter}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All languages</SelectItem>
          {LANGUAGES.map((code) => (
            <SelectItem key={code} value={code}>
              {langLabel(code)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value} onValueChange={handleSelect} disabled={loading}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder={loading ? 'Loading…' : 'Select a voice…'} />
        </SelectTrigger>
        <SelectContent>
          {filtered.map((voice) => (
            <SelectItem key={voice.voiceId} value={voice.voiceId}>
              {voice.name}
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
