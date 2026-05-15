import type { VoiceOption } from '@/types'

const API_BASE = 'https://api.elevenlabs.io'
const MODEL_ID = 'eleven_multilingual_v2'

// In-memory cache with 1h TTL
let voiceCache: { voices: VoiceOption[]; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000

const MOCK_VOICES: VoiceOption[] = [
  { voiceId: 'mock-voice-1', name: 'Rachel (Mock)', language: 'en', previewUrl: null },
  { voiceId: 'mock-voice-2', name: 'Domi (Mock)', language: 'en', previewUrl: null },
  { voiceId: 'mock-voice-3', name: 'Bella (Mock)', language: 'en', previewUrl: null },
  { voiceId: 'mock-voice-4', name: 'Antoni (Mock)', language: 'en', previewUrl: null },
  { voiceId: 'mock-voice-5', name: 'Elli (Mock)', language: 'en', previewUrl: null },
]

/** Minimal valid MP3 frame (silence) used in mock mode. */
const MOCK_MP3 = Buffer.from(
  'fffb9004000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  'hex',
)

/** Lists voices from ElevenLabs (admin's My Voices + defaults), cached 1h. */
export async function listVoices(): Promise<VoiceOption[]> {
  if (process.env.MOCK_EXTERNAL_SERVICES === 'true') return MOCK_VOICES

  if (voiceCache && Date.now() - voiceCache.fetchedAt < CACHE_TTL_MS) {
    return voiceCache.voices
  }

  const res = await fetch(`${API_BASE}/v1/voices`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
    next: { revalidate: 0 },
  })

  if (!res.ok) throw new Error(`ElevenLabs /v1/voices failed: ${res.status}`)

  const json = await res.json()
  const voices: VoiceOption[] = (json.voices ?? []).map((v: Record<string, unknown>) => ({
    voiceId: v.voice_id as string,
    name: v.name as string,
    language: ((v.labels as Record<string, string>)?.language ?? 'en') as string,
    previewUrl: (v.preview_url as string | null) ?? null,
  }))

  voiceCache = { voices, fetchedAt: Date.now() }
  return voices
}

/** Invalidate voice cache (e.g. after admin adds voices). */
export function invalidateVoiceCache() {
  voiceCache = null
}

/** Calls ElevenLabs TTS and returns MP3 bytes. Retries on 429/5xx (max 3). */
export async function tts(text: string, voiceId: string, seed: number): Promise<Buffer> {
  if (process.env.MOCK_EXTERNAL_SERVICES === 'true') {
    await new Promise((r) => setTimeout(r, 200))
    return MOCK_MP3
  }

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

    lastError = new Error(`ElevenLabs TTS failed: ${res.status}`)
  }

  throw lastError!
}

export { MODEL_ID }
