import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/lib/db'

const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean)

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      const isAdmin = adminEmails.includes(user.email)

      await db.user.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
          role: isAdmin ? 'admin' : 'user',
          status: isAdmin ? 'approved' : 'pending',
          lastLoginAt: new Date(),
        },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          lastLoginAt: new Date(),
        },
      })

      return true
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.user.findUnique({ where: { email: user.email } })
        if (dbUser) {
          token['id'] = dbUser.id
          token['role'] = dbUser.role
          token['status'] = dbUser.status
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.status = token.status as string
      }
      return session
    },
  },
})
