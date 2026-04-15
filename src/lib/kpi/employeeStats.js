// Created At: 2026-04-12 12:00:00 +07:00 (v1.2.0)
// Previous version: 2026-04-12 02:45:00 +07:00 (v1.0.1)
// Last Updated: 2026-04-12 12:00:00 +07:00 (v1.2.0)

import { getPrisma } from '@/lib/db';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';

/**
 * Aggregates KPI statistics for all employees in a tenant.
 * Includes: Total Customers, Total Sales (PAID), Growth MoM, and Tenure.
 * Sanitized for Edge Runtime compatibility.
 */
export async function getTenantEmployeeStats(tenantId) {
  const prisma = await getPrisma();
  
  // 1. Fetch all active employees
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      hiredAt: true,
      jobTitle: true,
      department: true,
    }
  });

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const statsPromises = employees.map(async (emp) => {
    // Total Customers assigned to this employee
    const customerCount = await prisma.customer.count({
      where: { assigneeId: emp.id, status: 'Active' }
    });

    // Total Sales (Paid Orders) from those customers
    const totalSalesAgg = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        customer: { assigneeId: emp.id },
        status: 'PAID'
      }
    });

    // Current Month Sales
    const currentSalesAgg = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        customer: { assigneeId: emp.id },
        status: 'PAID',
        date: { gte: currentMonthStart }
      }
    });

    // Previous Month Sales (for Growth)
    const prevSalesAgg = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        customer: { assigneeId: emp.id },
        status: 'PAID',
        date: { gte: prevMonthStart, lte: prevMonthEnd }
      }
    });

    const totalSales = totalSalesAgg._sum.totalAmount || 0;
    const currentSales = currentSalesAgg._sum.totalAmount || 0;
    const prevSales = prevSalesAgg._sum.totalAmount || 0;

    // Growth calculation
    let growth = 0;
    if (prevSales > 0) {
      growth = ((currentSales - prevSales) / prevSales) * 100;
    } else if (currentSales > 0) {
      growth = 100;
    }

    // Performance Score: (Sales * 0.7) + (CustomerCount * 0.3)
    const normalizedSales = totalSales / 1000;
    const score = (normalizedSales * 0.7) + (customerCount * 0.3);

    // Tenure (Months)
    let tenure = 0;
    if (emp.hiredAt) {
      const hiredDate = new Date(emp.hiredAt);
      tenure = (now.getFullYear() - hiredDate.getFullYear()) * 12 + (now.getMonth() - hiredDate.getMonth());
    }

    return {
      id: emp.id,
      kpis: {
        customers: customerCount,
        sales: totalSales,
        growth: Number(growth.toFixed(1)),
        tenure: Math.max(0, tenure),
        score: Number(score.toFixed(1)),
      }
    };
  });

  const results = await Promise.all(statsPromises);
  
  return results.reduce((acc, curr) => {
    acc[curr.id] = curr.kpis;
    return acc;
  }, {});
}
