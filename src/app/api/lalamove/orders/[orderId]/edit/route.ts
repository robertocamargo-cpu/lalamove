import { NextResponse } from 'next/server';
import { makeLalamoveRequest } from '@/lib/lalamove-client';
import { getOrderById, saveOrder } from '@/lib/storage';

export async function PATCH(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;
  const order = getOrderById(orderId);

  try {
    const body = await request.json();
    const { remarks, stops } = body;

    try {
      await makeLalamoveRequest('PATCH', `/v3/orders/${orderId}`, {
        data: {
          remarks,
          stops,
        },
      });
    } catch (apiErr: any) {
      console.warn('Edit order live API notice:', apiErr.message);
    }

    if (order) {
      if (remarks) order.remarks = remarks;
      saveOrder(order);
    }

    return NextResponse.json({
      success: true,
      message: `Pedido #${orderId} atualizado com sucesso!`,
      order,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao editar pedido' }, { status: 500 });
  }
}
