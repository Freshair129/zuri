// Created At: 2026-04-12 03:38:00 +07:00 (v1.2.5)
// Previous version: 2026-04-12 03:22:00 +07:00 (v1.2.4)
// Last Updated: 2026-04-12 03:38:00 +07:00 (v1.2.5)

import NextAuth from 'next-auth'
import { authOptions } from './auth-config'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
