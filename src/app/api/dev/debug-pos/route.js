import { NextResponse } from 'next/server';
import { listProducts } from '@/lib/repositories/productRepo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenantId = '10000000-0000-0000-0000-000000000001';
    
    // Direct repository call
    const result = await listProducts(tenantId, { isPosVisible: true, limit: 100 });
    
    return NextResponse.json({
      success: true,
      tenantId,
      productCount: result.products.length,
      sampleProduct: result.products[0]?.name || 'NONE',
      raw: result.products.slice(0, 2)
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
