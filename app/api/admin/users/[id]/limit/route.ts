import { NextResponse } from 'next/server'
import { requireAdmin, errorResponse } from '@/lib/authz'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  monthlyCharLimit: z.number().int().min(0).nullable(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const data = schema.parse(await req.json())
    await db.user.update({ where: { id }, data: { monthlyCharLimit: data.monthlyCharLimit } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return errorResponse(err)
  }
}
