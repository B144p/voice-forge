import type { VoiceOption } from '@/types'

const API_BASE = 'https://api.elevenlabs.io'
const MODEL_ID = 'eleven_multilingual_v2'

// In-memory cache with 1h TTL, keyed by language ('' = all languages)
const voiceCacheMap = new Map<string, { voices: VoiceOption[]; fetchedAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000

/**
 * Lists voices: user's own voices + shared library voices, merged and deduped, cached 1h.
 * Pass `language` (e.g. "zh", "en") to fetch shared voices filtered to that language.
 */
export async function listVoices(language?: string): Promise<VoiceOption[]> {
  const cacheKey = language ?? ''
  const cached = voiceCacheMap.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.voices

  const headers = { 'xi-api-key': process.env.ELEVENLABS_API_KEY! }
  const sharedUrl = language
    ? `${API_BASE}/v1/shared-voices?page_size=100&language=${encodeURIComponent(language)}`
    : `${API_BASE}/v1/shared-voices?page_size=100`

  const [ownRes, sharedRes] = await Promise.all([
    fetch(`${API_BASE}/v1/voices`, { headers, next: { revalidate: 0 } }),
    fetch(sharedUrl, { headers, next: { revalidate: 0 } }),
  ])

  if (!ownRes.ok) throw new Error(`ElevenLabs /v1/voices failed: ${ownRes.status}`)
  if (!sharedRes.ok) throw new Error(`ElevenLabs /v1/shared-voices failed: ${sharedRes.status}`)

  const [ownJson, sharedJson] = await Promise.all([ownRes.json(), sharedRes.json()])

  const ownVoices: VoiceOption[] = (ownJson.voices ?? []).map((v: Record<string, unknown>) => ({
    voiceId: v.voice_id as string,
    name: v.name as string,
    language: ((v.labels as Record<string, string>)?.language ?? null),
    previewUrl: (v.preview_url as string | null) ?? null,
    category: (v.category as string | null) ?? null,
  }))

  const sharedVoices: VoiceOption[] = (sharedJson.voices ?? []).map((v: Record<string, unknown>) => ({
    voiceId: v.voice_id as string,
    name: v.name as string,
    language: (v.language as string | null) ?? null,
    previewUrl: (v.preview_url as string | null) ?? null,
    category: 'community',
  }))

  const seen = new Set(ownVoices.map((v) => v.voiceId))
  const merged = [
    ...ownVoices,
    ...sharedVoices.filter((v) => !seen.has(v.voiceId)),
  ].sort((a, b) => a.name.localeCompare(b.name))

  voiceCacheMap.set(cacheKey, { voices: merged, fetchedAt: Date.now() })
  return merged
}

/** Invalidate voice cache (e.g. after admin adds voices). */
export function invalidateVoiceCache() {
  voiceCacheMap.clear()
}

/** Calls ElevenLabs TTS and returns MP3 bytes. Retries on 429/5xx (max 3). */
export async function tts(text: string, voiceId: string, seed: number): Promise<Buffer> {
  const body = JSON.stringify({
    text,
    model_id: MODEL_ID,
    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    seed,
    output_format: 'mp3_44100_128',
  })

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * 3 ** (attempt - 1)))

    const res = await fetch(`${API_BASE}/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body,
    })

    if (res.ok) {
      const buf = await res.arrayBuffer()
      return Buffer.from(buf)
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(`ElevenLabs auth error: ${res.status}`)
    }
    if (res.status === 402) {
      throw new Error(`ElevenLabs quota exceeded: insufficient credits (402)`)
    }

    lastError = new Error(`ElevenLabs TTS failed: ${res.status}`)
  }

  throw lastError!
}

export { MODEL_ID }
