import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { SetView } from '@/components/sets/SetView'

export const dynamic = 'force-dynamic'

export default async function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id

  const set = await db.speechSet.findFirst({
    where: { id, userId },
    include: {
      items: { orderBy: { index: 'asc' } },
      job: true,
    },
  })

  if (!set) notFound()

  return <SetView initialSet={set} />
}
