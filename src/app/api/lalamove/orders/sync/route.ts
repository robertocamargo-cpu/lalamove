import { NextResponse } from 'next/server';
import { makeLalamoveRequest } from '@/lib/lalamove-client';
import { saveOrder, saveMultipleOrders, getOrderById } from '@/lib/storage';
import { Order, StopDeliveryStatus, DriverInfo } from '@/types/lalamove';
function parseCsvLine(line: string, delimiter: string): string[] {
  const columns: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i]; const next = line[i + 1];
    if (char === '"') {
      if (quoted && next === '"') { current += '"'; i++; } else { quoted = !quoted; }
    } else if (char === delimiter && !quoted) { columns.push(current.trim()); current = ''; } else { current += char; }
  }
  columns.push(current.trim());
  return columns;
}
function normalizeCsvHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function findColumn(headers: string[], names: string[]): number {
  return headers.findIndex((header) => names.includes(header));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, orderIds, csvText } = body;

    // Caso 1: Importação por texto/arquivo CSV exportado da Lalamove ("Registros")
    if (csvText && typeof csvText === 'string') {
      const lines = csvText.split(/\r?\n/);
      if (lines.length < 2) {
        return NextResponse.json({ error: 'Arquivo CSV vazio ou sem linhas de dados.' }, { status: 400 });
      }

      const importedOrders: Order[] = [];
      const delimiter = lines.find((line) => line.trim().length > 0)?.includes(';') ? ';' : ',';
      const headerLineIndex = lines.findIndex((line) => normalizeCsvHeader(parseCsvLine(line, delimiter)[0]) === 'order id');
      if (headerLineIndex < 0) {
        return NextResponse.json({ error: 'NÃ£o foi encontrado o cabeÃ§alho ORDER ID no CSV.' }, { status: 400 });
      }
      const headers = parseCsvLine(lines[headerLineIndex], delimiter).map(normalizeCsvHeader);
      const idIdx = findColumn(headers, ['order id', 'pedido id', 'id pedido']);
      const statusIdx = findColumn(headers, ['order status', 'status', 'estado']);
      const priceIdx = findColumn(headers, ['final charge', 'valor', 'preco', 'total', 'price', 'custo']);
      const dateIdx = findColumn(headers, ['created time', 'data/hora', 'data', 'date']);
      const vehicleIdx = findColumn(headers, ['service type', 'modal', 'veiculo', 'tipo']);
      const originIdx = findColumn(headers, ['pick-up addresses', 'pickup address', 'origem', 'coleta']);
      const destIdx = findColumn(headers, ['mid-stop / drop-off address', 'drop-off address', 'destino', 'entrega']);
      const distanceIdx = findColumn(headers, ['distance (km)', 'distancia (km)', 'distancia']);

      for (let i = headerLineIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = parseCsvLine(lines[i], delimiter);
        const parsedId = idIdx >= 0 ? cols[idIdx]?.trim() : '';
        if (!parsedId || !/^\d+$/.test(parsedId)) continue;
        const driverIdx = findColumn(headers, ['user', 'motorista', 'driver']);
        const plateIdx = findColumn(headers, ['placa', 'plate']);
        const rawDate = dateIdx >= 0 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString();
        const rawStatus = (statusIdx >= 0 && cols[statusIdx] ? cols[statusIdx].toUpperCase() : 'COMPLETED');
        const rawPrice = priceIdx >= 0 && cols[priceIdx] ? cols[priceIdx].replace(/[^\d.,]/g, '').replace(',', '.') : '25.00';
        const rawVehicle = (vehicleIdx >= 0 && cols[vehicleIdx] ? cols[vehicleIdx].toUpperCase() : 'LALAPRO');
        const rawDriver = driverIdx >= 0 && cols[driverIdx] ? cols[driverIdx] : 'Motorista Parceiro';
        const rawPlate = plateIdx >= 0 && cols[plateIdx] ? cols[plateIdx] : 'BRA2E19';
        const originAddr = originIdx >= 0 && cols[originIdx] ? cols[originIdx] : 'Rua do Glicério, 557 - Liberdade, São Paulo - SP';
        const destAddr = destIdx >= 0 && cols[destIdx] ? cols[destIdx] : 'Cliente Destino - São Paulo - SP';

        const orderObj: Order = {
          orderId: parsedId,
          quotationId: `quote_${parsedId}`,
          serviceType: rawVehicle.includes('CARRO') ? 'CAR' : rawVehicle.includes('UTIL') || rawVehicle.includes('FIORINO') ? 'LUV' : 'LALAPRO',
          status: rawStatus.includes('CANC') ? 'CANCELED' : 'COMPLETED',
          createdAt: new Date(rawDate).toString() !== 'Invalid Date' ? new Date(rawDate).toISOString() : new Date().toISOString(),
          priceBreakdown: {
            currency: 'BRL',
            base: rawPrice,
            extraMileage: '0.00',
            surcharge: '0.00',
            total: Number(parseFloat(rawPrice) || 0).toFixed(2),
          },
          distanceKm: distanceIdx >= 0 && cols[distanceIdx] ? (cols[distanceIdx] + ' km') : '0.0 km',
          driver: {
            id: `drv_${i}`,
            name: rawDriver,
            phone: '+55 11 99999-0000',
            plate: rawPlate,
            vehicleModel: rawVehicle,
          },
          stops: [
            {
              stopId: `stop_0_${parsedId}`,
              address: originAddr,
              clientName: 'Expedição Matriz',
              clientPhone: '+55 11 3333-4444',
              status: 'DELIVERED',
              shareLink: `https://lalamove.com/share/track?id=${parsedId}&stop=0`,
            },
            {
              stopId: `stop_1_${parsedId}`,
              address: destAddr,
              clientName: 'Cliente',
              clientPhone: '+55 11 98888-0000',
              status: 'DELIVERED',
              shareLink: `https://lalamove.com/share/track?id=${parsedId}&stop=1`,
              pod: {
                receiverName: 'Recebedor Autorizado',
                deliveredAt: 'Finalizado',
              },
            },
          ],
          isRouteOptimized: true,
          remarks: 'Importado dos Registros Lalamove',
        };

        importedOrders.push(orderObj);
      }

      saveMultipleOrders(importedOrders);

      return NextResponse.json({
        success: true,
        count: importedOrders.length,
        message: `${importedOrders.length} envios importados com sucesso dos Registros Lalamove!`,
      });
    }

    // Caso 2: Sincronização por ID(s) de Pedido diretamente na API Oficial Lalamove v3
    const idsToSync = orderIds && Array.isArray(orderIds) ? orderIds : orderId ? [orderId] : [];

    if (idsToSync.length === 0) {
      return NextResponse.json({ error: 'Informe um orderId ou envie o arquivo CSV de Registros.' }, { status: 400 });
    }

    const syncedOrders: Order[] = [];
    const errors: string[] = [];

    for (const rawId of idsToSync) {
      const cleanId = String(rawId).trim();
      if (!cleanId) continue;

      try {
        const liveResponse = await makeLalamoveRequest('GET', `/v3/orders/${cleanId}`);

        if (liveResponse && liveResponse.data) {
          const d = liveResponse.data;
          const orderObj: Order = {
            orderId: d.orderId || cleanId,
            quotationId: d.quotationId || `quote_${cleanId}`,
            serviceType: d.serviceType || 'LALAPRO',
            status: d.status || 'COMPLETED',
            createdAt: d.placedAt || d.createdAt || new Date().toISOString(),
            scheduleAt: d.scheduleAt,
            priceBreakdown: {
              currency: d.priceBreakdown?.currency || 'BRL',
              base: d.priceBreakdown?.base || '0.00',
              extraMileage: d.priceBreakdown?.extraMileage || '0.00',
              surcharge: d.priceBreakdown?.surcharge || '0.00',
              total: d.priceBreakdown?.total || '0.00',
            },
            distanceKm: `${(Number(d.distance?.value || 0) / 1000).toFixed(1)} km`,
            driver: d.driverId
              ? {
                  id: d.driverId,
                  name: d.driverName || 'Motorista Parceiro Lalamove',
                  phone: d.driverPhone || '',
                  plate: d.driverPlate || 'BRA-0000',
                  vehicleModel: d.driverVehicle || 'Veículo Lalamove',
                }
              : undefined,
            stops: (d.stops || []).map((s: any, idx: number) => ({
              stopId: s.stopId || `stop_${idx}`,
              address: s.address || '',
              clientName: s.name || (idx === 0 ? 'Origem' : `Destino ${idx}`),
              clientPhone: s.phone || '',
              status: idx === 0 ? 'DELIVERED' : 'DELIVERED',
              shareLink: s.shareLink || `https://lalamove.com/share/track?id=${cleanId}&stop=${idx}`,
              pod: s.pod
                ? {
                    receiverName: s.pod.name,
                    photoUrl: s.pod.image,
                    signatureUrl: s.pod.signature,
                    deliveredAt: s.pod.deliveredAt || new Date().toISOString(),
                  }
                : undefined,
            })),
            isRouteOptimized: true,
            remarks: 'Sincronizado via API Oficial Lalamove v3',
          };

          saveOrder(orderObj);
          syncedOrders.push(orderObj);
        } else {
          errors.push(`Pedido #${cleanId} não encontrado na Lalamove.`);
        }
      } catch (err: any) {
        errors.push(`Erro ao consultar pedido #${cleanId}: ${err.message}`);
      }
    }

    if (syncedOrders.length > 0) {
      return NextResponse.json({
        success: true,
        count: syncedOrders.length,
        syncedOrders,
        errors: errors.length > 0 ? errors : undefined,
        message: `${syncedOrders.length} pedido(s) sincronizado(s) com sucesso da Lalamove!`,
      });
    }

    return NextResponse.json(
      {
        error: errors.join(' | ') || 'Nenhum pedido localizado com o(s) ID(s) informado(s).',
      },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao sincronizar pedidos' }, { status: 500 });
  }
}

