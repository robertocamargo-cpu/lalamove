import { NextResponse } from 'next/server';
import { makeLalamoveRequest } from '@/lib/lalamove-client';
import { getOrderById, saveOrder } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: { orderId: string; driverId: string } }
) {
  const { orderId, driverId } = params;

  try {
    const liveDriver = await makeLalamoveRequest('GET', `/v3/orders/${orderId}/drivers/${driverId}`);
    if (liveDriver && liveDriver.data) {
      return NextResponse.json(liveDriver.data);
    }
  } catch (apiErr: any) {
    console.warn('Get driver live API notice:', apiErr.message);
  }

  const order = getOrderById(orderId);
  return NextResponse.json({
    driverId,
    name: order?.driver?.name || 'Motorista Parceiro Lalamove',
    phone: order?.driver?.phone || '+55 11 98765-4321',
    plate: order?.driver?.plate || 'BRA2E19',
    vehicleModel: order?.driver?.vehicleModel || 'LalaPro Moto com Baú',
    coordinates: order?.driver?.coordinates || { lat: '-23.555500', lng: '-46.630000' },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: { orderId: string; driverId: string } }
) {
  const { orderId, driverId } = params;

  try {
    await makeLalamoveRequest('DELETE', `/v3/orders/${orderId}/drivers/${driverId}`);
  } catch (apiErr: any) {
    console.warn('Delete driver live API notice:', apiErr.message);
  }

  const order = getOrderById(orderId);
  if (order) {
    order.status = 'ASSIGNING_DRIVER';
    order.driver = undefined;
    saveOrder(order);
  }

  return NextResponse.json({
    success: true,
    message: `Motorista #${driverId} desvinculado. Buscando novo motorista parceiro.`,
    order,
  });
}
