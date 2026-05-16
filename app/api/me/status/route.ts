import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Used by the waiting page to check live DB status without requiring approval.
// The JWT caches status at sign-in time, so we must hit the DB directly here.
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as { id: string }
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { status: true },
  })

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ status: dbUser.status })
}
