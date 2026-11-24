import { NextResponse } from 'next/server';
import { getOrderById, saveOrder } from '@/lib/storage';
import { makeLalamoveRequest } from '@/lib/lalamove-client';

export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;
  const order = getOrderById(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  try {
    await makeLalamoveRequest('DELETE', `/v3/orders/${orderId}`);
  } catch (err: any) {
    console.warn('Cancel live API fallback:', err.message);
  }

  order.status = 'CANCELED';
  saveOrder(order);

  return NextResponse.json({
    message: 'Pedido cancelado com sucesso.',
    order,
  });
}

