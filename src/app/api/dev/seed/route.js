import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
// import bcrypt from 'bcryptjs'; (Removed for Middleware safety)

export const dynamic = 'force-dynamic';

/**
 * DEV ONLY: Seeds test user + real course data from GitHub for POS verification.
 * Follows Stable V7 (Immutable System) for Product IDs.
 * Usage: POST /api/dev/seed
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  const VSCHOOL_TENANT_ID = '10000000-0000-0000-0000-000000000001';

  try {
    // 1. Ensure Tenant exists
    const prisma = await getPrisma()
    await prisma.tenant.upsert({
      where: { id: VSCHOOL_TENANT_ID },
      update: {},
      create: {
        id: VSCHOOL_TENANT_ID,
        tenantSlug: 'vschool',
        tenantName: 'V School',
        plan: 'PRO',
        isActive: true
      }
    });

    // 2. Create/Update Test User (Cashier)
    const email = 'tester@vschool.io';
    const password = 'Password123!';
    const bcrypt = (await import('bcryptjs')).default;
    const passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.employee.upsert({
      where: { email },
      update: {
        roles: ['OWNER', 'MANAGER', 'SALES', 'DEV'],
        role: 'OWNER',
        status: 'ACTIVE'
      },
      create: {
        employeeId: 'TVS-EMP-MGT-001',
        tenantId: VSCHOOL_TENANT_ID,
        firstName: 'Zuri',
        lastName: 'Tester',
        email,
        passwordHash,
        role: 'OWNER',
        roles: ['OWNER', 'MANAGER', 'SALES', 'DEV'],
        status: 'ACTIVE'
      }
    });

    // 3. Seed real course data from course_summary.md
    const realCourses = [
      // 1. Japanese Culinary (japanese_culinary)
      { sku: 'TVS-JP-2FC-HC-01', name: 'เรียนอาหารญี่ปุ่นพื้นฐาน', category: 'japanese_culinary', basePrice: 9900, posPrice: 9900, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-HR-02', name: 'อาหารญี่ปุ่นพื้นบ้าน', category: 'japanese_culinary', basePrice: 11500, posPrice: 11500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-SC-03', name: 'ซูชิและซาซิมิเบื้องต้น', category: 'japanese_culinary', basePrice: 17000, posPrice: 17000, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-HN-04', name: 'ราเมนมืออาชีพ', category: 'japanese_culinary', basePrice: 17000, posPrice: 17000, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-SC-05', name: 'แล่ปลาแซลมอน', category: 'japanese_culinary', basePrice: 19990, posPrice: 19990, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-SC-06', name: 'ฟิวชัน ซูชิ', category: 'japanese_culinary', basePrice: 9900, posPrice: 9900, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-HR-07', name: 'ดงบูริ ข้าวหน้า 8 เมนู', category: 'japanese_culinary', basePrice: 8800, posPrice: 8800, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-DS-08', name: 'ขนมหวานญี่ปุ่น', category: 'japanese_culinary', basePrice: 4500, posPrice: 4500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-HO-09', name: 'ทาโกะยากิ', category: 'japanese_culinary', basePrice: 2500, posPrice: 2500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-HO-10', name: 'ชาบู ชาบู', category: 'japanese_culinary', basePrice: 5500, posPrice: 5500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-HO-11', name: 'เกี๊ยวซ่า แป้งสด', category: 'japanese_culinary', basePrice: 7500, posPrice: 7500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-HC-12', name: 'อิซากาย่า', category: 'japanese_culinary', basePrice: 7500, posPrice: 7500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-HO-13', name: 'ยากินิกุ', category: 'japanese_culinary', basePrice: 9900, posPrice: 9900, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-HN-14', name: 'ราเมนเส้นสด', category: 'japanese_culinary', basePrice: 5500, posPrice: 5500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-2FC-CO-15', name: 'น้ำสลัดยอดนิยม', category: 'japanese_culinary', basePrice: 5500, posPrice: 5500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-1FC-HO-16', name: 'คัตสึเร็สึ เมนูทอด', category: 'japanese_culinary', basePrice: 8800, posPrice: 8800, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-1FC-HR-17', name: 'อาหาร เทปันยากิ', category: 'japanese_culinary', basePrice: 12500, posPrice: 12500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-1FC-DS-18', name: 'ขนมหวาน 4 ฤดู', category: 'japanese_culinary', basePrice: 32000, posPrice: 32000, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-1FC-SC-19', name: 'โอมากาเสะปลาไทย', category: 'japanese_culinary', basePrice: 15500, posPrice: 15500, isPosVisible: true, isActive: true },
      { sku: 'TVS-JP-1FC-HC-20', name: 'ทักษะพื้นฐาน โดยเชฟ', category: 'japanese_culinary', basePrice: 12500, posPrice: 12500, isPosVisible: true, isActive: true },

      // 2. Specialty & Arts (specialty)
      { sku: 'TVS-SP-2FC-HO-01', name: 'แคนนาเดียนล็อบสเตอร์', category: 'specialty', basePrice: 17000, posPrice: 17000, isPosVisible: true, isActive: true },
      { sku: 'TVS-MG-1FC-MG-01', name: 'การบริหารจัดการครัว', category: 'management', basePrice: 9900, posPrice: 9900, isPosVisible: true, isActive: true },
      { sku: 'TVS-AR-1FC-AR-01', name: 'ศิลปะการจัดการจาน', category: 'arts', basePrice: 15500, posPrice: 15500, isPosVisible: true, isActive: true },

      // 3. Business Packages (package)
      { sku: 'TVS-PKG01-BUFFET-30H', name: 'เปิดร้านบุฟเฟต์', category: 'package', basePrice: 49000, posPrice: 32800, isPosVisible: true, isActive: true },
      { sku: 'TVS-PKG02-DELIVERY-39H', name: 'เปิดร้าน Delivery', category: 'package', basePrice: 49000, posPrice: 33900, isPosVisible: true, isActive: true },
      { sku: 'TVS-PKG03-RAMEN-39H', name: 'เปิดร้านราเมง', category: 'package', basePrice: 55500, posPrice: 39400, isPosVisible: true, isActive: true },
      { sku: 'TVS-PKG04-CAFE-42H', name: 'เปิดร้านคาเฟ่', category: 'package', basePrice: 72000, posPrice: 49600, isPosVisible: true, isActive: true },
      { sku: 'TVS-PKG05-HOTKITCHEN-63H', name: 'เปิดร้านครัวร้อน', category: 'package', basePrice: 82500, posPrice: 51900, isPosVisible: true, isActive: true },
      { sku: 'TVS-PKG06-ABROAD-63H', name: 'ไปต่างประเทศ', category: 'package', basePrice: 94000, posPrice: 59390, isPosVisible: true, isActive: true },
      { sku: 'TVS-PKG07-PROCHEF-78H', name: 'เชฟอาหารญี่ปุ่นมืออาชีพ', category: 'package', basePrice: 119500, posPrice: 74890, isPosVisible: true, isActive: true },

      // 4. Full Courses (full_course)
      { sku: 'TVS-FC-FULL-COURSES-A-111H', name: 'Full Course 111 Hrs', category: 'full_course', basePrice: 110000, posPrice: 110000, isPosVisible: true, isActive: true },
      { sku: 'TVS-FC-FULL-COURSES-B-201H', name: 'Full Course 201 Hrs', category: 'full_course', basePrice: 160000, posPrice: 160000, isPosVisible: true, isActive: true },
    ];

    let createdCount = 0;
    let updatedCount = 0;
    for (const product of realCourses) {
      const existing = await prisma.product.findUnique({ where: { sku: product.sku } });
      if (existing) {
        await prisma.product.update({
          where: { sku: product.sku },
          data: { ...product, tenantId: VSCHOOL_TENANT_ID }
        });
        updatedCount++;
      } else {
        await prisma.product.create({
          data: { ...product, tenantId: VSCHOOL_TENANT_ID }
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seed complete: user + ${createdCount} new products added, ${updatedCount} updated`,
      credentials: { email, password },
      tenantId: VSCHOOL_TENANT_ID,
      productsSeeded: createdCount,
      productsUpdated: updatedCount,
    });
  } catch (error) {
    console.error('[DevSeed]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
