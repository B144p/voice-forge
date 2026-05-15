import { requireOwner, errorResponse } from '@/lib/authz'
import { db } from '@/lib/db'
import { getMp3Buffer } from '@/lib/r2'
import { createZipBuffer } from '@/lib/zip'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { set } = await requireOwner(id)

    const items = await db.speechItem.findMany({
      where: { setId: id, status: 'completed', r2Key: { not: null } },
      orderBy: { index: 'asc' },
    })

    const zipItems = await Promise.all(
      items.map(async (item) => ({
        index: item.index,
        text: item.text,
        buffer: await getMp3Buffer(item.r2Key!),
      })),
    )

    const zipBuffer = createZipBuffer(zipItems)
    const filename = set.title.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 50)

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}.zip"`,
        'Content-Length': String(zipBuffer.byteLength),
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
