import { NextResponse } from 'next/server';
import { refreshLiveOrder } from '@/lib/lalamove-orders';
import { lalamoveErrorStatus } from '@/lib/lalamove-client';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  try { return NextResponse.json(await refreshLiveOrder(params.orderId)); }
  catch (err: any) { return NextResponse.json({ error: err.message }, { status: lalamoveErrorStatus(err) }); }
}
