import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireApproved, errorResponse } from '@/lib/authz'
import { listVoices } from '@/lib/elevenlabs'

export async function GET(req: NextRequest) {
  try {
    await requireApproved()
    const language = req.nextUrl.searchParams.get('language') ?? undefined
    const voices = await listVoices(language)
    return NextResponse.json(voices)
  } catch (err) {
    return errorResponse(err)
  }
}
