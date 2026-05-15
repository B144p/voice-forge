import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApproved, errorResponse, AppError } from '@/lib/authz'
import { db } from '@/lib/db'
import { listVoices, tts, MODEL_ID } from '@/lib/elevenlabs'
import { uploadMp3, itemR2Key } from '@/lib/r2'
import { logUsage, checkMonthlyCapExceeded } from '@/lib/usage'

const createSetSchema = z.object({
  title: z.string().min(1).max(100).trim(),
  voiceId: z.string().min(1),
  items: z
    .array(
      z.object({
        text: z
          .string()
          .min(1)
          .max(5000)
          .transform((s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()),
      }),
    )
    .min(1)
    .max(30),
})

export async function POST(req: Request) {
  try {
    const user = await requireApproved()

    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw new AppError('Invalid JSON', 400, 'BAD_REQUEST')
    }

    const parsed = createSetSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      if (issue?.path[0] === 'items' && typeof issue.path[1] === 'number') {
        return NextResponse.json(
          { error: { code: 'INVALID_ITEM', message: issue.message, details: { index: issue.path[1] } } },
          { status: 400 },
        )
      }
      throw new AppError(parsed.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR')
    }

    const { title, voiceId, items } = parsed.data

    if (items.length > 30) {
      throw new AppError(`Maximum 30 items per Set. Received ${items.length}.`, 400, 'TOO_MANY_ITEMS')
    }

    for (let i = 0; i < items.length; i++) {
      if (items[i].text.trim().length === 0) {
        throw new AppError('Item text cannot be empty after trimming.', 400, 'EMPTY_ITEM')
      }
      if (items[i].text.length > 5000) {
        throw new AppError('Item text exceeds 5000 characters.', 400, 'ITEM_TOO_LONG')
      }
    }

    // Validate voiceId against cached list (re-fetch once if missing)
    let voices = await listVoices()
    if (!voices.find((v) => v.voiceId === voiceId)) {
      const { invalidateVoiceCache } = await import('@/lib/elevenlabs')
      invalidateVoiceCache()
      voices = await listVoices()
      if (!voices.find((v) => v.voiceId === voiceId)) {
        throw new AppError('Unknown voice ID.', 400, 'INVALID_VOICE')
      }
    }

    const voiceName = voices.find((v) => v.voiceId === voiceId)!.name
    const totalCharacters = items.reduce((sum, item) => sum + item.text.length, 0)

    await checkMonthlyCapExceeded(user.id, totalCharacters)

    // Create SpeechSet, SpeechItems, and Job in one transaction
    const set = await db.$transaction(async (tx) => {
      const newSet = await tx.speechSet.create({
        data: {
          userId: user.id,
          title,
          voiceId,
          voiceName,
          modelId: MODEL_ID,
          status: 'pending',
          totalCharacters,
          itemCount: items.length,
          items: {
            create: items.map((item, index) => ({
              index,
              text: item.text,
              seed: Math.floor(Math.random() * 2_147_483_647),
              status: 'pending' as const,
              characterCount: item.text.length,
            })),
          },
        },
        include: { items: true },
      })

      await tx.job.create({
        data: {
          setId: newSet.id,
          status: 'queued',
          itemsTotal: items.length,
        },
      })

      return newSet
    })

    // For now: run synchronously (Phase 4 will move to waitUntil background)
    await runJob(set.id, user.id, voiceId, MODEL_ID)

    return NextResponse.json({ id: set.id }, { status: 202 })
  } catch (err) {
    return errorResponse(err)
  }
}

async function runJob(setId: string, userId: string, voiceId: string, modelId: string) {
  const { default: pLimit } = await import('p-limit')
  const limit = pLimit(2)

  await db.job.update({
    where: { setId },
    data: { status: 'running', startedAt: new Date() },
  })
  await db.speechSet.update({ where: { id: setId }, data: { status: 'processing' } })

  const items = await db.speechItem.findMany({
    where: { setId },
    orderBy: { index: 'asc' },
  })

  const tasks = items.map((item) =>
    limit(async () => {
      try {
        await db.speechItem.update({ where: { id: item.id }, data: { status: 'processing' } })

        const mp3 = await tts(item.text, voiceId, item.seed)
        const key = itemR2Key(userId, setId, item.id)
        await uploadMp3(key, mp3)

        await db.speechItem.update({
          where: { id: item.id },
          data: { status: 'completed', r2Key: key },
        })

        await logUsage({
          userId,
          setId,
          itemId: item.id,
          action: 'generate',
          characters: item.characterCount,
          model: modelId,
          voiceId,
        })

        await db.job.update({
          where: { setId },
          data: { itemsCompleted: { increment: 1 }, heartbeatAt: new Date() },
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        await db.speechItem.update({
          where: { id: item.id },
          data: { status: 'failed', errorMessage: msg },
        })
        await db.job.update({
          where: { setId },
          data: { itemsFailed: { increment: 1 }, heartbeatAt: new Date() },
        })
      }
    }),
  )

  await Promise.all(tasks)

  const job = await db.job.findUniqueOrThrow({ where: { setId } })
  const finalStatus =
    job.itemsFailed === 0
      ? 'completed'
      : job.itemsCompleted === 0
        ? 'failed'
        : 'partial'

  await db.job.update({
    where: { setId },
    data: { status: job.itemsFailed === 0 ? 'completed' : 'failed', finishedAt: new Date() },
  })
  await db.speechSet.update({
    where: { id: setId },
    data: { status: finalStatus },
  })
}

export async function GET(req: Request) {
  try {
    const user = await requireApproved()
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') ?? ''
    const status = searchParams.get('status') ?? ''
    const cursor = searchParams.get('cursor') ?? undefined

    const PAGE_SIZE = 20

    const sets = await db.speechSet.findMany({
      where: {
        userId: user.id,
        ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        status: true,
        itemCount: true,
        voiceName: true,
        createdAt: true,
      },
    })

    const hasMore = sets.length > PAGE_SIZE
    const items = hasMore ? sets.slice(0, PAGE_SIZE) : sets

    return NextResponse.json({
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
