import { NextResponse } from 'next/server'
import { requireApproved, errorResponse } from '@/lib/authz'
import { listVoices } from '@/lib/elevenlabs'

export async function GET() {
  try {
    await requireApproved()
    const voices = await listVoices()
    return NextResponse.json(voices)
  } catch (err) {
    return errorResponse(err)
  }
}
