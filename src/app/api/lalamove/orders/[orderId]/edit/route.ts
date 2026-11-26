import { NextResponse } from 'next/server';
import { makeLalamoveRequest, lalamoveErrorStatus } from '@/lib/lalamove-client';
import { assertLiveOrder, mapLiveOrder } from '@/lib/lalamove-orders';
import { saveOrder } from '@/lib/storage';
import { hasValidCoordinates } from '@/lib/geocode';
export async function PATCH(request: Request, { params }: { params: { orderId: string } }) {
  try {
    const order = assertLiveOrder(params.orderId);
    const { stops } = await request.json();
    if (!Array.isArray(stops) || stops.length < 2 || stops.some(s => !s.address || !s.name || !s.phone || !hasValidCoordinates(s.coordinates))) {
      return NextResponse.json({ error: 'Envie todas as paradas com endereço, coordenadas e contatos, preservando a coleta original.' }, { status: 400 });
    }
    const { data } = await makeLalamoveRequest('PATCH', `/v3/orders/${encodeURIComponent(order.orderId)}`, { data: { stops } });
    const updated = mapLiveOrder(data, order); saveOrder(updated);
    return NextResponse.json({ success: true, message: 'Pedido atualizado na Lalamove.', order: updated });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: lalamoveErrorStatus(err) }); }
}
