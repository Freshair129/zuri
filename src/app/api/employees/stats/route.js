// Created At: 2026-04-12 02:50:00 +07:00 (v1.0.1)
// Previous version: 2026-04-12 02:50:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-12 03:40:00 +07:00 (v1.0.1)

import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import { withAuth } from '@/lib/auth';
import { getTenantEmployeeStats } from '@/lib/kpi/employeeStats';
import { getTenantContext } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/employees/stats
 * Returns KPI statistics for all employees in the current tenant.
 */
export const GET = withAuth(async (request) => {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run within the tenant context to ensure Prisma extension filters correctly
    const stats = await getTenantContext().run({ tenantId }, () => getTenantEmployeeStats(tenantId));

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('[EmployeeStats_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { domain: 'employees', action: 'R' });
