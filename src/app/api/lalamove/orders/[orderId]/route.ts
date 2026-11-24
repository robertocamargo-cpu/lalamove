import { NextResponse } from 'next/server';
import { getOrderById } from '@/lib/storage';
import { makeLalamoveRequest } from '@/lib/lalamove-client';

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;

  try {
    // Tenta consultar API da Lalamove se real
    const liveData = await makeLalamoveRequest('GET', `/v3/orders/${orderId}`);
    if (liveData && liveData.data) {
      return NextResponse.json(liveData.data);
    }
  } catch (e) {
    // Ignora e usa memória local
  }

  const order = getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(order);
}

