import { NextResponse } from 'next/server'
import { requireOwner, errorResponse } from '@/lib/authz'
import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireOwner(id)

    const set = await db.speechSet.findUniqueOrThrow({
      where: { id },
      include: {
        items: { orderBy: { index: 'asc' } },
        job: true,
      },
    })

    return NextResponse.json(set)
  } catch (err) {
    return errorResponse(err)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { set, user } = await requireOwner(id)

    // Delete R2 objects for all completed items
    const { deleteMp3 } = await import('@/lib/r2')
    const items = await db.speechItem.findMany({ where: { setId: id, r2Key: { not: null } } })
    await Promise.allSettled(items.map((item) => deleteMp3(item.r2Key!)))

    await db.speechSet.delete({ where: { id } })

    void user // used for ownership check

    return new Response(null, { status: 204 })
  } catch (err) {
    return errorResponse(err)
  }
}
