import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/waiting', '/revoked', '/api/auth', '/api/me/status']

export default auth(function middleware(req: NextRequest & { auth: { user?: { id?: string; role?: string; status?: string } } | null }) {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Not authenticated → login
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { status, role } = session.user as { status?: string; role?: string }

  // Pending → waiting
  if (status === 'pending') {
    return NextResponse.redirect(new URL('/waiting', req.url))
  }

  // Revoked → revoked
  if (status === 'revoked') {
    return NextResponse.redirect(new URL('/revoked', req.url))
  }

  // Admin routes require admin role
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (role !== 'admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403 },
      )
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
