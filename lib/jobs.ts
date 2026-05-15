import { db } from '@/lib/db'
import { tts, MODEL_ID } from '@/lib/elevenlabs'
import { uploadMp3, itemR2Key } from '@/lib/r2'
import { logUsage } from '@/lib/usage'
import pLimit from 'p-limit'

/** Runs the full generation job for a SpeechSet. Safe to call inside after(). */
export async function runSetJob(setId: string): Promise<void> {
  const set = await db.speechSet.findUniqueOrThrow({
    where: { id: setId },
    include: { items: { orderBy: { index: 'asc' } } },
  })

  await db.job.update({
    where: { setId },
    data: { status: 'running', startedAt: new Date() },
  })
  await db.speechSet.update({ where: { id: setId }, data: { status: 'processing' } })

  const limit = pLimit(2)

  const tasks = set.items.map((item) =>
    limit(async () => {
      try {
        await db.speechItem.update({ where: { id: item.id }, data: { status: 'processing' } })

        const mp3 = await tts(item.text, set.voiceId, item.seed)
        const key = itemR2Key(set.userId, setId, item.id)
        await uploadMp3(key, mp3)

        await db.speechItem.update({
          where: { id: item.id },
          data: { status: 'completed', r2Key: key },
        })

        await logUsage({
          userId: set.userId,
          setId,
          itemId: item.id,
          action: 'generate',
          characters: item.characterCount,
          model: MODEL_ID,
          voiceId: set.voiceId,
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
  const finalSetStatus =
    job.itemsFailed === 0 ? 'completed' : job.itemsCompleted === 0 ? 'failed' : 'partial'

  await db.job.update({
    where: { setId },
    data: {
      status: job.itemsFailed === 0 ? 'completed' : 'failed',
      finishedAt: new Date(),
    },
  })
  await db.speechSet.update({ where: { id: setId }, data: { status: finalSetStatus } })
}
