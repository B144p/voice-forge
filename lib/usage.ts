import { db } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

const COST_PER_CHAR = 0.0001

/** Returns total characters consumed by a user in the current calendar month. */
export async function getMonthlyUsage(userId: string): Promise<number> {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const result = await db.usageLog.aggregate({
    where: { userId, createdAt: { gte: start } },
    _sum: { characters: true },
  })
  return result._sum.characters ?? 0
}

/** Throws 402 AppError if adding newChars would exceed the user's monthly cap. */
export async function checkMonthlyCapExceeded(userId: string, newChars: number): Promise<void> {
  const { AppError } = await import('@/lib/authz')
  const dbUser = await db.user.findUniqueOrThrow({ where: { id: userId } })
  if (dbUser.monthlyCharLimit === null) return

  const used = await getMonthlyUsage(userId)
  if (used + newChars > dbUser.monthlyCharLimit) {
    throw new AppError('This Set would exceed your monthly character cap.', 402, 'MONTHLY_CAP_EXCEEDED')
  }
}

/** Inserts a UsageLog row for a completed ElevenLabs call. */
export async function logUsage({
  userId,
  setId,
  itemId,
  action,
  characters,
  model,
  voiceId,
}: {
  userId: string
  setId?: string
  itemId?: string
  action: 'generate' | 'regenerate'
  characters: number
  model: string
  voiceId: string
}) {
  const costUsd = new Decimal(characters * COST_PER_CHAR)
  await db.usageLog.create({
    data: { userId, setId, itemId, action, characters, model, voiceId, costUsd },
  })
}
