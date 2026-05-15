import { NextResponse } from 'next/server'
import { requireOwner, errorResponse } from '@/lib/authz'
import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await requireOwner(id)

    const [set, job, items] = await Promise.all([
      db.speechSet.findUniqueOrThrow({ where: { id } }),
      db.job.findUnique({ where: { setId: id } }),
      db.speechItem.findMany({
        where: { setId: id },
        orderBy: { index: 'asc' },
        select: { id: true, index: true, status: true, characterCount: true, errorMessage: true },
      }),
    ])

    return NextResponse.json({
      status: set.status,
      itemsTotal: job?.itemsTotal ?? items.length,
      itemsCompleted: job?.itemsCompleted ?? 0,
      itemsFailed: job?.itemsFailed ?? 0,
      items,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
