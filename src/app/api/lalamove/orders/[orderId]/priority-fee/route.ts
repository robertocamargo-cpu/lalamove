import { NextResponse } from 'next/server';
import { makeLalamoveRequest, lalamoveErrorStatus } from '@/lib/lalamove-client';
import { assertLiveOrder, mapLiveOrder } from '@/lib/lalamove-orders';
import { saveOrder } from '@/lib/storage';
export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const order = assertLiveOrder(params.orderId);
    const { fee } = await request.json();
    if (!/^\d+(\.\d{1,2})?$/.test(String(fee)) || Number(fee) <= 0) {
      return NextResponse.json({ error: 'Informe uma taxa positiva, com até duas casas decimais.' }, { status: 400 });
    }
    const { data } = await makeLalamoveRequest('POST', `/v3/orders/${encodeURIComponent(order.orderId)}/priority-fee`, { data: { priorityFee: Number(fee).toFixed(2) } });
    const updated = mapLiveOrder(data, order); saveOrder(updated);
    return NextResponse.json({ success: true, message: 'Taxa confirmada pela Lalamove.', order: updated });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: lalamoveErrorStatus(err) }); }
}
