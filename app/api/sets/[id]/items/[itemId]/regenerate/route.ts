import { NextResponse } from 'next/server'
import { requireOwner, errorResponse, AppError } from '@/lib/authz'
import { db } from '@/lib/db'
import { tts, MODEL_ID } from '@/lib/elevenlabs'
import { uploadMp3, itemR2Key } from '@/lib/r2'
import { logUsage } from '@/lib/usage'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id: setId, itemId } = await params
    const { user, set } = await requireOwner(setId)

    const item = await db.speechItem.findFirst({ where: { id: itemId, setId } })
    if (!item) throw new AppError('Item not found.', 404, 'NOT_FOUND')
    if (item.status === 'processing') throw new AppError('Item is currently processing.', 409, 'CONFLICT')

    const newSeed = Math.floor(Math.random() * 2_147_483_647)

    await db.speechItem.update({ where: { id: itemId }, data: { status: 'processing' } })

    try {
      const mp3 = await tts(item.text, set.voiceId, newSeed)
      const key = itemR2Key(user.id, setId, itemId)
      await uploadMp3(key, mp3)

      const updated = await db.speechItem.update({
        where: { id: itemId },
        data: {
          status: 'completed',
          r2Key: key,
          seed: newSeed,
          regenerationCount: { increment: 1 },
          errorMessage: null,
        },
      })

      await logUsage({
        userId: user.id,
        setId,
        itemId,
        action: 'regenerate',
        characters: item.characterCount,
        model: MODEL_ID,
        voiceId: set.voiceId,
      })

      return NextResponse.json({
        id: updated.id,
        status: updated.status,
        regenerationCount: updated.regenerationCount,
        characterCount: updated.characterCount,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await db.speechItem.update({
        where: { id: itemId },
        data: { status: 'failed', errorMessage: msg },
      })
      throw new AppError(`Regeneration failed: ${msg}`, 500, 'REGEN_FAILED')
    }
  } catch (err) {
    return errorResponse(err)
  }
}
