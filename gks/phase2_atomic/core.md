# Technology Stack: Core

- **Framework**: Next.js 14 (App Router) — deployed on Vercel (serverless)
- **Language**: JavaScript (JSX) — **NOT TypeScript** (except `src/lib/db.ts` for Prisma)
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **Cache**: Upstash Redis (REST) — `getOrSet` pattern with TTL
- **Queue**: Upstash QStash — cron workers (no BullMQ, no local Redis)
- **Realtime**: Pusher Channels (new-message, customer-updated)
- **Auth**: NextAuth.js v4 (JWT, credentials provider, bcrypt)
- **Styling**: Tailwind CSS + Framer Motion + Lucide icons + Recharts
