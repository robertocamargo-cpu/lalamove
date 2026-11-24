import { NextResponse } from 'next/server';
import { getOrderById, saveOrder } from '@/lib/storage';

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;
  const order = getOrderById(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  // Se ainda estiver na coleta
  if (order.status === 'ASSIGNING_DRIVER') {
    order.status = 'ON_GOING';
  } else if (order.status === 'ON_GOING') {
    order.status = 'PICKED_UP';
    if (order.stops[0]) {
      order.stops[0].status = 'DELIVERED';
      order.stops[0].completedAt = new Date().toISOString();
    }
    // Primeira parada de entrega passa a estar IN_TRANSIT
    if (order.stops[1]) {
      order.stops[1].status = 'IN_TRANSIT';
    }
  } else if (order.status === 'PICKED_UP') {
    // Procura próxima parada pendente
    const pendingStopIdx = order.stops.findIndex(
      (s, idx) => idx > 0 && s.status !== 'DELIVERED'
    );

    if (pendingStopIdx !== -1) {
      const stop = order.stops[pendingStopIdx];
      if (stop.status === 'IN_TRANSIT') {
        stop.status = 'ARRIVED';
        stop.arrivedAt = new Date().toISOString();
      } else {
        stop.status = 'DELIVERED';
        stop.completedAt = new Date().toISOString();
        // Gera comprovante POD digital
        stop.pod = {
          receiverName: stop.clientName || 'Recebedor Autorizado',
          receiverDoc: 'RG 34.819.201-X',
          deliveredAt: new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          photoUrl:
            'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600',
          signatureUrl:
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M10 50 Q 50 10 90 40 T 170 30" fill="none" stroke="%23F26522" stroke-width="3"/></svg>',
        };

        // Passa a próxima parada para IN_TRANSIT se houver
        if (order.stops[pendingStopIdx + 1]) {
          order.stops[pendingStopIdx + 1].status = 'IN_TRANSIT';
        }
      }
    }

    // Se todas as paradas foram entregues, marca COMPLETED
    const allDelivered = order.stops
      .slice(1)
      .every((s) => s.status === 'DELIVERED');
    if (allDelivered) {
      order.status = 'COMPLETED';
    }
  }

  saveOrder(order);

  return NextResponse.json({
    message: 'Status atualizado com sucesso.',
    order,
  });
}

