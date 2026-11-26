import { NextResponse } from 'next/server';
import { saveOrder } from '@/lib/storage';
import { assertLiveOrder } from '@/lib/lalamove-orders';
import { makeLalamoveRequest, lalamoveErrorStatus } from '@/lib/lalamove-client';
export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const order = assertLiveOrder(params.orderId);
    const driverId = order.driverId;
    if (!driverId) return NextResponse.json({ error: 'Nenhum motorista atribuído pela Lalamove.' }, { status: 409 });
    await makeLalamoveRequest('DELETE', `/v3/orders/${encodeURIComponent(order.orderId)}/drivers/${encodeURIComponent(driverId)}`, { data: { reason: 'DRIVER_LATE' } });
    order.driver = undefined; order.driverId = undefined; order.status = 'ASSIGNING_DRIVER';
    order.lastSyncedAt = new Date().toISOString(); order.syncWarning = undefined;
    saveOrder(order);
    return NextResponse.json({ message: 'Troca solicitada à Lalamove. Aguardando novo motorista.', order });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: lalamoveErrorStatus(err) }); }
}
