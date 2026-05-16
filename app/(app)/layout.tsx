import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) redirect('/login')
  if ((session.user as { status?: string }).status === 'pending') redirect('/waiting')
  if ((session.user as { status?: string }).status === 'revoked') redirect('/revoked')

  const isAdmin = (session.user as { role?: string }).role === 'admin'

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/create" className="text-lg font-semibold">
              VoiceForge
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/create" className="text-muted-foreground hover:text-foreground">
                Create
              </Link>
              <Link href="/sets" className="text-muted-foreground hover:text-foreground">
                Library
              </Link>
              {isAdmin && (
                <>
                  <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
                    Users
                  </Link>
                  <Link href="/admin/usage" className="text-muted-foreground hover:text-foreground">
                    Usage
                  </Link>
                </>
              )}
            </nav>
          </div>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
