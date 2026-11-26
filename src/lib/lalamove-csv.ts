import { Order, OrderStatus, LalamoveServiceType } from '@/types/lalamove';

function rows(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(cell.trim()); cell = '';
      if (char === '\n') { result.push(row); row = []; }
    } else if (char !== '\r') cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); result.push(row); }
  return result;
}

export function importLalamoveCsv(text: string): Order[] {
  const parsed = rows(text.replace(/^\uFEFF/, ''));
  const start = parsed.findIndex(r => r[0]?.toUpperCase() === 'ORDER ID');
  if (start < 0) throw new Error('Não foi encontrado o cabeçalho ORDER ID no CSV da Lalamove.');
  const headers = parsed[start].map(s => s.toUpperCase());
  const orders: Order[] = [];
  for (const row of parsed.slice(start + 1)) {
    const cell = (key: string) => row[headers.indexOf(key)] || '';
    const orderId = cell('ORDER ID');
    if (!/^\d+$/.test(orderId)) continue;
    const statusText = cell('ORDER STATUS').toUpperCase();
    const statuses: Record<string, OrderStatus> = { COMPLETED: 'COMPLETED', CANCELED: 'CANCELED', CANCELLED: 'CANCELED', REJECTED: 'REJECTED', EXPIRED: 'EXPIRED', ON_GOING: 'ON_GOING', PICKED_UP: 'PICKED_UP', ASSIGNING_DRIVER: 'ASSIGNING_DRIVER' };
    const date = cell('CREATED TIME');
    // Horário local do relatório brasileiro, sem depender do timezone do servidor.
    const createdAt = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date) ? new Date(date.replace(' ', 'T') + '-03:00').toISOString() : '';
    const rawPrice = cell('FINAL CHARGE').replace(',', '.');
    const total = rawPrice && Number.isFinite(Number(rawPrice)) ? Math.abs(Number(rawPrice)).toFixed(2) : '';
    const vehicle = cell('SERVICE TYPE');
    const serviceType = ({ LALAPRO: 'LALAPRO', LALAGO: 'LALAGO', CARRO: 'CAR', CAR: 'CAR', HATCHBACK: 'HATCHBACK', FIORINO: 'UV_FIORINO', VAN: 'VAN' } as Record<string, LalamoveServiceType>)[vehicle.toUpperCase()] || vehicle as LalamoveServiceType;
    orders.push({
      orderId, quotationId: '', serviceType, status: statuses[statusText] || 'UNKNOWN', createdAt,
      priceBreakdown: { currency: cell('CURRENCY') || 'BRL', base: '', extraMileage: '', surcharge: '', total },
      distanceKm: cell('DISTANCE (KM)') ? `${cell('DISTANCE (KM)')} km` : 'Não informada',
      stops: [cell('PICK-UP ADDRESSES'), cell('MID-STOP / DROP-OFF ADDRESS')].map(address => ({
        stopId: '', address, clientName: '', clientPhone: '', status: 'UNKNOWN' as const,
      })),
      isRouteOptimized: false, remarks: cell('ORDER REMARK'), source: 'csv', isLiveApi: false,
    });
  }
  return Array.from(new Map(orders.map(o => [o.orderId, o])).values());
}
