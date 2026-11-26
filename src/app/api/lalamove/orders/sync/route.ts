import { NextResponse } from 'next/server';
import { refreshLiveOrder } from '@/lib/lalamove-orders';
import { saveMultipleOrders } from '@/lib/storage';
import { importLalamoveCsv } from '@/lib/lalamove-csv';

export async function POST(request: Request) {
  try {
    const { orderId, orderIds, csvText } = await request.json();
    if (typeof csvText === 'string') {
      const importedOrders = importLalamoveCsv(csvText);
      if (!importedOrders.length) return NextResponse.json({ error: 'Nenhum pedido válido encontrado no CSV.' }, { status: 400 });
      saveMultipleOrders(importedOrders);
      return NextResponse.json({ success: true, count: importedOrders.length,
        message: `${importedOrders.length} pedido(s) importado(s) do CSV. Rastreamento e motorista dependem da sincronização pela API.` });
    }
    const ids = Array.from(new Set<string>((Array.isArray(orderIds) ? orderIds : orderId ? [orderId] : []).map(String)));
    if (!ids.length || ids.length > 50 || ids.some(id => !/^\d+$/.test(id))) {
      return NextResponse.json({ error: 'Informe de 1 a 50 IDs numéricos da Lalamove.' }, { status: 400 });
    }
    const syncedOrders = [], errors = [];
    for (const id of ids) {
      try { syncedOrders.push(await refreshLiveOrder(id)); }
      catch (err: any) { errors.push(`Pedido #${id}: ${err.message}`); }
    }
    if (!syncedOrders.length) return NextResponse.json({ error: errors.join(' | ') }, { status: 502 });
    return NextResponse.json({ success: true, count: syncedOrders.length, syncedOrders, errors,
      message: `${syncedOrders.length} pedido(s) sincronizado(s) pela API.${errors.length ? ' Falhas: ' + errors.join(' | ') : ''}` });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 400 }); }
}
