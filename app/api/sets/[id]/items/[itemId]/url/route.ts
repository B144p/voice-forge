import { NextResponse } from 'next/server'
import { requireOwner, errorResponse, AppError } from '@/lib/authz'
import { db } from '@/lib/db'
import { getPresignedUrl } from '@/lib/r2'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await params
    await requireOwner(id)

    const item = await db.speechItem.findFirst({
      where: { id: itemId, setId: id },
    })
    if (!item) throw new AppError('Item not found.', 404, 'NOT_FOUND')
    if (!item.r2Key) throw new AppError('Audio not yet available.', 404, 'NOT_READY')

    const { url, expiresAt } = await getPresignedUrl(item.r2Key)
    return NextResponse.json({ url, expiresAt })
  } catch (err) {
    return errorResponse(err)
  }
}
