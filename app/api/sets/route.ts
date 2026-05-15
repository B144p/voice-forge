import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import { requireApproved, errorResponse, AppError } from '@/lib/authz'
import { db } from '@/lib/db'
import { MODEL_ID } from '@/lib/elevenlabs'
import { checkMonthlyCapExceeded } from '@/lib/usage'
import { runSetJob } from '@/lib/jobs'
import { checkRateLimit } from '@/lib/rate-limit'

const createSetSchema = z.object({
  title: z.string().trim().min(1).max(100),
  voiceId: z.string().min(1),
  voiceName: z.string().min(1),
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

    const rateLimitRes = await checkRateLimit(user.id)
    if (rateLimitRes) return rateLimitRes

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
          {
            error: {
              code: 'INVALID_ITEM',
              message: issue.message,
              details: { index: issue.path[1] },
            },
          },
          { status: 400 },
        )
      }
      throw new AppError(
        parsed.error.issues[0]?.message ?? 'Validation error',
        400,
        'VALIDATION_ERROR',
      )
    }

    const { title, voiceId, voiceName, items } = parsed.data

    if (items.length > 30) {
      throw new AppError(
        `Maximum 30 items per Set. Received ${items.length}.`,
        400,
        'TOO_MANY_ITEMS',
      )
    }

    for (let i = 0; i < items.length; i++) {
      if (items[i].text.trim().length === 0) {
        throw new AppError('Item text cannot be empty after trimming.', 400, 'EMPTY_ITEM')
      }
      if (items[i].text.length > 5000) {
        return NextResponse.json(
          {
            error: {
              code: 'ITEM_TOO_LONG',
              message: 'Item text exceeds 5000 characters.',
              details: { index: i },
            },
          },
          { status: 400 },
        )
      }
    }

    const totalCharacters = items.reduce((sum, item) => sum + item.text.length, 0)

    await checkMonthlyCapExceeded(user.id, totalCharacters)

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
      })

      await tx.job.create({
        data: { setId: newSet.id, status: 'queued', itemsTotal: items.length },
      })

      return newSet
    })

    // Run job in background after response is sent
    after(() => runSetJob(set.id))

    return NextResponse.json({ id: set.id }, { status: 202 })
  } catch (err) {
    return errorResponse(err)
  }
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
    const pageItems = hasMore ? sets.slice(0, PAGE_SIZE) : sets

    return NextResponse.json({
      items: pageItems,
      nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id : null,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
