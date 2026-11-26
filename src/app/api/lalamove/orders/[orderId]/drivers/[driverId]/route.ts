import { NextResponse } from 'next/server';
import { loadLiveDriver, assertLiveOrder } from '@/lib/lalamove-orders';
import { lalamoveErrorStatus } from '@/lib/lalamove-client';
import { POST } from '../../change-driver/route';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: { orderId: string; driverId: string } }) {
  try { return NextResponse.json(await loadLiveDriver(params.orderId, params.driverId)); }
  catch (err: any) { return NextResponse.json({ error: err.message }, { status: lalamoveErrorStatus(err) }); }
}
export async function DELETE(request: Request, context: { params: { orderId: string; driverId: string } }) {
  try {
    if (assertLiveOrder(context.params.orderId).driverId !== context.params.driverId) {
      return NextResponse.json({ error: 'Este motorista não está atribuído ao pedido.' }, { status: 409 });
    }
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 409 }); }
  return POST(request, context);
}
