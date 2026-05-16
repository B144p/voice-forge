import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message)
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode },
    )
  }
  console.error(error)
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
    { status: 500 },
  )
}

export async function requireApproved() {
  const session = await auth()
  if (!session?.user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED')
  const user = session.user as { id: string; email?: string | null; role: string; status: string }
  if (user.status === 'pending') throw new AppError('Access pending', 403, 'PENDING')
  if (user.status === 'revoked') throw new AppError('Access revoked', 403, 'REVOKED')
  return user
}

export async function requireAdmin() {
  const user = await requireApproved()
  if (user.role !== 'admin') throw new AppError('Forbidden', 403, 'FORBIDDEN')
  return user
}

export async function requireOwner(setId: string) {
  const user = await requireApproved()
  const set = await db.speechSet.findFirst({
    where: { id: setId, userId: user.id },
  })
  if (!set) throw new AppError('Set not found.', 404, 'NOT_FOUND')
  return { user, set }
}
