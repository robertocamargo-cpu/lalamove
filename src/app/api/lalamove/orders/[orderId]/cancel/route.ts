import { NextResponse } from 'next/server';
import { saveOrder } from '@/lib/storage';
import { assertLiveOrder } from '@/lib/lalamove-orders';
import { makeLalamoveRequest, lalamoveErrorStatus } from '@/lib/lalamove-client';
export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const order = assertLiveOrder(params.orderId);
    await makeLalamoveRequest('DELETE', `/v3/orders/${encodeURIComponent(params.orderId)}`);
    order.status = 'CANCELED'; order.lastSyncedAt = new Date().toISOString(); order.syncWarning = undefined;
    saveOrder(order);
    return NextResponse.json({ message: 'Pedido cancelado na Lalamove.', order });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: lalamoveErrorStatus(err) }); }
}
