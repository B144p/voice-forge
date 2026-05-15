import { NextResponse } from 'next/server'
import { requireApproved, errorResponse } from '@/lib/authz'
import { db } from '@/lib/db'
import { getMonthlyUsage } from '@/lib/usage'

export async function GET() {
  try {
    const user = await requireApproved()
    const dbUser = await db.user.findUniqueOrThrow({ where: { id: user.id } })
    const charactersThisMonth = await getMonthlyUsage(user.id)

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      image: dbUser.image,
      role: dbUser.role,
      status: dbUser.status,
      monthlyCharLimit: dbUser.monthlyCharLimit,
      charactersThisMonth,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
