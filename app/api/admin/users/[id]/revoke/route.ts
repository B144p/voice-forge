import { NextResponse } from 'next/server'
import { requireAdmin, errorResponse } from '@/lib/authz'
import { db } from '@/lib/db'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    await db.user.update({ where: { id }, data: { status: 'revoked' } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return errorResponse(err)
  }
}
