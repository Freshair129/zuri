// Created At: 2026-04-12 03:36:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-12 03:36:00 +07:00 (v1.0.0)

/**
 * Isolated Authentication Configuration
 * This file is SHARED with the Edge Runtime (via auth.js / middleware check links).
 * It MUST remain side-effect free and avoid direct framework imports where possible.
 */
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { findByEmail } = await import('@/lib/repositories/employeeRepo')
        const employee = await findByEmail(credentials?.email)
        if (!employee) return null

        const { isMockMode } = await import('@/lib/mockMode')
        const isMockAdmin = isMockMode && credentials.email === 'admin@vschool.io' && credentials.password === 'admin'
        
        const bcrypt = (await import('bcryptjs')).default
        const valid = isMockAdmin || await bcrypt.compare(credentials.password, employee.passwordHash)
        if (!valid) return null

        // Fetch tenant slug + isActive for subdomain routing in middleware
        const { getTenantById } = await import('@/lib/repositories/tenantRepo')
        const tenant = await getTenantById(employee.tenantId)

        return {
          id: employee.id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          role: employee.role,
          roles: employee.roles,
          tenantId: employee.tenantId,
          tenantSlug: tenant?.tenantSlug ?? null,
          isActive: tenant?.isActive ?? true,
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return baseUrl + url
      return baseUrl + '/overview'
    },
    async jwt({ token, user }) {
      if (user) {
        token.employeeId = user.employeeId
        token.role = user.role
        token.roles = user.roles
        token.tenantId = user.tenantId
        token.tenantSlug = user.tenantSlug
        token.isActive = user.isActive

        // Session registration uses dynamic imports to protect Edge
        try {
          const { headers } = await import('next/headers')
          const { registerSession } = await import('@/lib/session-manager')
          
          const heads = headers()
          const ip = heads.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
          const ua = heads.get('user-agent') || 'unknown'
          const deviceId = heads.get('cookie')?.split('; ')?.find(row => row.startsWith('x-device-id='))?.split('=')[1] || null
          
          await registerSession({
            employeeId: user.id,
            tenantId: user.tenantId,
            sessionId: token.jti,
            ip,
            ua,
            deviceId
          })
        } catch (err) {
          console.error('[NextAuth] Session registration failed:', err)
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.sub
      session.user.employeeId = token.employeeId
      session.user.sessionId = token.jti
      session.user.role = token.role
      session.user.roles = token.roles
      session.user.tenantId = token.tenantId
      session.user.tenantSlug = token.tenantSlug
      session.user.isActive = token.isActive
      return session
    },
  },
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
