'use client';

// Created At: 2026-04-10 04:00:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 04:00:00 +07:00 (v1.0.0)

import { redirect } from 'next/navigation';

export default function AdminRoot() {
  redirect('/admin/tenants');
}
