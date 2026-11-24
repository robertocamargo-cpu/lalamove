import { NextResponse } from 'next/server';
import { getOrderById, saveOrder } from '@/lib/storage';
import { makeLalamoveRequest } from '@/lib/lalamove-client';

const ALTERNATIVE_DRIVERS = [
  {
    id: 'drv_sp_201',
    name: 'Juliano Ferreira Ramos',
    phone: '+55 11 98112-3344',
    plate: 'FJK8C22',
    vehicleModel: 'Fiat Fiorino 1.4 EVO (Branco)',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    coordinates: { lat: '-23.559000', lng: '-46.626000' },
  },
  {
    id: 'drv_sp_202',
    name: 'Fernando Augusto Barbosa',
    phone: '+55 11 97654-9988',
    plate: 'EXP4D11',
    vehicleModel: 'Peugeot Partner Rapid (Branca)',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    coordinates: { lat: '-23.553200', lng: '-46.634100' },
  },
];

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
    if (order.driver?.id) {
      await makeLalamoveRequest(
        'POST',
        `/v3/orders/${orderId}/drivers/${order.driver.id}/change`,
        { reason: 'DRIVER_DELAYED' }
      );
    }
  } catch (err: any) {
    console.warn('Driver change live API fallback:', err.message);
  }

  // Atribui novo motorista na simulação
  const newDriver =
    ALTERNATIVE_DRIVERS.find((d) => d.id !== order.driver?.id) || ALTERNATIVE_DRIVERS[0];

  order.driver = newDriver;
  saveOrder(order);

  return NextResponse.json({
    message: 'Motorista trocado com sucesso.',
    order,
  });
}

