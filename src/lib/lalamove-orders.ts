import { Order, OrderStatus, DriverInfo, StopDeliveryStatus, QuotationResponse } from '@/types/lalamove';
import { makeLalamoveRequest, getLalamoveConfig } from './lalamove-client';
import { getOrderById, saveOrder } from './storage';

export const FINAL_STATUSES = ['COMPLETED', 'CANCELED', 'REJECTED', 'EXPIRED'];
const ORDER_STATUSES = ['ASSIGNING_DRIVER', 'ON_GOING', 'PICKED_UP', ...FINAL_STATUSES];

export function assertLiveOrder(orderId: string): Order {
  const order = getOrderById(orderId);
  if (!order || !order.isLiveApi || order.apiEnv !== getLalamoveConfig().env) {
    throw new Error('Sincronize este pedido pela API antes de realizar alterações.');
  }
  return order;
}

export function mapLiveOrder(d: any, previous?: Order, quote?: QuotationResponse): Order {
  if (!d?.orderId || !d.status) throw new Error('Resposta incompleta do pedido na Lalamove.');
  const stops: StopDeliveryStatus[] = (d.stops || previous?.stops || quote?.stops || []).map((s: any, i: number) => {
    const old = previous?.stops.find(stop => stop.stopId && stop.stopId === String(s.stopId)) || previous?.stops[i];
    const pod = s.POD;
    const status = pod?.status === 'FAILED' ? 'FAILED'
      : ['DELIVERED', 'SIGNED'].includes(pod?.status) ? 'DELIVERED'
      : i === 0 && ['PICKED_UP', 'COMPLETED'].includes(d.status) ? 'DELIVERED'
      : 'PENDING';
    return {
      stopId: String(s.stopId || old?.stopId || quote?.stops[i]?.stopId || ''),
      address: s.address || old?.address || '', coordinates: s.coordinates || old?.coordinates,
      clientName: s.name || old?.clientName || '', clientPhone: s.phone || old?.clientPhone || '',
      remarks: s.remarks || old?.remarks, status,
      shareLink: s.shareLink || d.shareLink || undefined,
      completedAt: pod?.deliveredAt,
      pod: pod && ['DELIVERED', 'SIGNED'].includes(pod.status) ? {
        photoUrl: pod.status === 'DELIVERED' ? pod.image : undefined,
        signatureUrl: pod.status === 'SIGNED' ? pod.image : undefined,
        deliveredAt: pod.deliveredAt,
      } : undefined,
    };
  });
  const driverId = d.driverId ? String(d.driverId) : undefined;
  return {
    orderId: String(d.orderId), quotationId: d.quotationId || previous?.quotationId || quote?.quotationId || '',
    serviceType: d.serviceType || previous?.serviceType || quote?.serviceType || 'Não informado',
    deliveryTier: previous?.deliveryTier || quote?.deliveryTier,
    status: (ORDER_STATUSES.includes(d.status) ? d.status : 'UNKNOWN') as OrderStatus,
    createdAt: d.createdAt || d.placedAt || previous?.createdAt || '',
    scheduleAt: d.scheduleAt || previous?.scheduleAt || quote?.scheduleAt,
    priceBreakdown: d.priceBreakdown || previous?.priceBreakdown || quote?.priceBreakdown || {
      currency: 'BRL', base: '', extraMileage: '', surcharge: '', total: '',
    },
    distanceKm: d.distance ? `${(Number(d.distance.value) / 1000).toFixed(1)} km`
      : previous?.distanceKm || quote?.distance.text || 'Não informada',
    driverId, driver: driverId && driverId === previous?.driverId ? previous?.driver : undefined,
    stops, isRouteOptimized: d.isRouteOptimized ?? previous?.isRouteOptimized ?? quote?.isRouteOptimized ?? false,
    remarks: previous?.remarks, isLiveApi: true, source: 'api', apiEnv: getLalamoveConfig().env,
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function loadLiveDriver(orderId: string, driverId: string): Promise<DriverInfo> {
  const { data: d } = await makeLalamoveRequest('GET', `/v3/orders/${encodeURIComponent(orderId)}/drivers/${encodeURIComponent(driverId)}`);
  return { id: String(d.driverId || driverId), name: d.name || '', phone: d.phone || '',
    plate: d.plateNumber || '', vehicleModel: d.vehicleModel || '', photoUrl: d.photo,
    coordinates: d.coordinates };
}

export async function refreshLiveOrder(orderId: string): Promise<Order> {
  const previous = getOrderById(orderId);
  const { data } = await makeLalamoveRequest('GET', `/v3/orders/${encodeURIComponent(orderId)}`);
  const order = mapLiveOrder(data, previous);
  if (order.driverId && !FINAL_STATUSES.includes(order.status)) {
    try { order.driver = await loadLiveDriver(order.orderId, order.driverId); }
    catch (err: any) { order.syncWarning = `Dados do motorista indisponíveis: ${err.message}`; }
  }
  saveOrder(order);
  return order;
}
