import { requireOwner, errorResponse, AppError } from '@/lib/authz'
import { db } from '@/lib/db'
import { getMp3Buffer } from '@/lib/r2'
import { concatMp3 } from '@/lib/mp3-concat'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireOwner(id)

    const items = await db.speechItem.findMany({
      where: { setId: id },
      orderBy: { index: 'asc' },
    })

    const incompleteCount = items.filter((i) => i.status !== 'completed').length
    if (incompleteCount > 0) {
      throw new AppError('Set is not yet complete.', 409, 'NOT_COMPLETE')
    }

    const buffers = await Promise.all(items.map((item) => getMp3Buffer(item.r2Key!)))
    const combined = concatMp3(buffers)

    return new Response(combined.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="combined.mp3"`,
        'Content-Length': String(combined.length),
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
