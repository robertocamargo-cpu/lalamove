import { NextResponse } from 'next/server';
import {
  makeLalamoveRequest,
} from '@/lib/lalamove-client';
import {
  Order,
  StopDeliveryStatus,
  DriverInfo,
} from '@/types/lalamove';
import {
  getQuotationById,
  saveOrder,
  getAllOrders,
} from '@/lib/storage';

const MOCK_DRIVERS: DriverInfo[] = [
  {
    id: 'drv_sp_101',
    name: 'Carlos Eduardo Mendes',
    phone: '+55 11 98765-4321',
    plate: 'BRA2E19',
    vehicleModel: 'Fiat Fiorino 1.4 Hard Working (Branca)',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    coordinates: { lat: '-23.555500', lng: '-46.630000' },
  },
  {
    id: 'drv_sp_102',
    name: 'Marcos Vinicius Santos',
    phone: '+55 11 97123-8899',
    plate: 'RKS9F44',
    vehicleModel: 'Renault Master Furgão (Prata)',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    coordinates: { lat: '-23.558000', lng: '-46.632000' },
  },
  {
    id: 'drv_sp_103',
    name: 'Rodrigo Lima Silva',
    phone: '+55 11 99887-1122',
    plate: 'GHJ3A88',
    vehicleModel: 'Honda CG 160 Cargo (Preta)',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    coordinates: { lat: '-23.554000', lng: '-46.627000' },
  },
];

export async function GET() {
  const orders = getAllOrders();
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quotationId, sender, recipients, remarks } = body;

    if (!quotationId) {
      return NextResponse.json(
        { error: 'quotationId é obrigatório para contratação da corrida.' },
        { status: 400 }
      );
    }

    const quote = getQuotationById(quotationId);

    // Tenta emissão real na Lalamove v3 se disponível
    let realOrderResult: any = null;
    try {
      const orderPayload = {
        data: {
          quotationId,
          sender: sender || {
            stopId: quote?.stops[0]?.stopId,
            name: 'Expedição Lalamove Matriz',
            phone: '+551133334444',
          },
          recipients: recipients || [],
          isPODRequired: true,
          partnerMetadata: {
            source: 'LalamoveExpressWeb',
            department: 'Expedicao-Guardanapos',
          },
        },
      };

      realOrderResult = await makeLalamoveRequest('POST', '/v3/orders', orderPayload);
    } catch (err: any) {
      console.warn('Live order creation fallback:', err.message);
    }

    const orderId =
      realOrderResult?.data?.orderId ||
      `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Monta status por parada com links de rastreio individuais
    const originStop: StopDeliveryStatus = {
      stopId: quote?.stops[0]?.stopId || `stop_0_${orderId}`,
      address: quote?.stops[0]?.address || 'Rua do Glicério, 557 - Liberdade, São Paulo - SP',
      clientName: sender?.name || 'Expedição Matriz (Guardanapos & Descartáveis)',
      clientPhone: sender?.phone || '+55 11 3333-4444',
      status: 'ARRIVED',
      shareLink: `https://lalamove.com/share/track?id=${orderId}&stop=0`,
      arrivedAt: new Date().toISOString(),
    };

    const deliveryStops: StopDeliveryStatus[] = (quote?.stops.slice(1) || []).map(
      (s, idx) => {
        const recipient = recipients?.[idx] || {};
        return {
          stopId: s.stopId || `stop_${idx + 1}_${orderId}`,
          address: s.address,
          clientName: recipient.name || `Cliente Destino ${idx + 1}`,
          clientPhone: recipient.phone || '+55 11 98888-0000',
          status: 'PENDING',
          shareLink: `https://lalamove.com/share/track?id=${orderId}&stop=${idx + 1}`,
        };
      }
    );

    const randomDriver = MOCK_DRIVERS[Math.floor(Math.random() * MOCK_DRIVERS.length)];

    const newOrder: Order = {
      orderId,
      quotationId,
      serviceType: quote?.serviceType || 'LUV',
      status: 'ON_GOING',
      createdAt: new Date().toISOString(),
      scheduleAt: quote?.scheduleAt,
      priceBreakdown: quote?.priceBreakdown || {
        currency: 'BRL',
        base: '45.00',
        extraMileage: '12.00',
        surcharge: '0.00',
        total: '57.00',
      },
      distanceKm: quote?.distance?.text || '12.5 km',
      driver: randomDriver,
      stops: [originStop, ...deliveryStops],
      isRouteOptimized: quote?.isRouteOptimized ?? true,
      remarks: remarks || 'Guardanapos de Papel e Descartáveis - Manter Seco',
    };

    saveOrder(newOrder);

    return NextResponse.json(newOrder, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao criar pedido na Lalamove' },
      { status: 500 }
    );
  }
}

