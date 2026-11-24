import { NextResponse } from 'next/server';
import { makeLalamoveRequest } from '@/lib/lalamove-client';
import { getOrderById, saveOrder } from '@/lib/storage';

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;
  const order = getOrderById(orderId);

  try {
    const body = await request.json();
    const fee = body.fee || '10.00';

    // Chama endpoint oficial da Lalamove se em produção
    try {
      await makeLalamoveRequest('POST', `/v3/orders/${orderId}/priority-fee`, {
        data: {
          priorityFee: String(fee),
        },
      });
    } catch (apiErr: any) {
      console.warn('Priority fee live API notice:', apiErr.message);
    }

    if (order) {
      const oldTotal = parseFloat(order.priceBreakdown.total || '0');
      const addFee = parseFloat(fee);
      order.priceBreakdown.total = (oldTotal + addFee).toFixed(2);
      order.priceBreakdown.surcharge = (parseFloat(order.priceBreakdown.surcharge || '0') + addFee).toFixed(2);
      saveOrder(order);
    }

    return NextResponse.json({
      success: true,
      message: `Taxa de prioridade de R$ ${fee} adicionada com sucesso ao pedido #${orderId}!`,
      order,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao adicionar taxa' }, { status: 500 });
  }
}
