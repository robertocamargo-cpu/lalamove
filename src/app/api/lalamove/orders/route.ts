import { NextResponse } from 'next/server';
import { makeLalamoveRequest, getLalamoveConfig, lalamoveErrorStatus, LalamoveApiError } from '@/lib/lalamove-client';
import { getQuotationById, saveOrder, getAllOrders, beginOrderSubmission, clearOrderSubmission } from '@/lib/storage';
import { mapLiveOrder, refreshLiveOrder, FINAL_STATUSES } from '@/lib/lalamove-orders';

export const dynamic = 'force-dynamic';
const inFlight = new Set<string>();

export async function GET() {
  const env = getLalamoveConfig().env;
  const orders = getAllOrders().filter(o => o.source === 'csv' || (o.isLiveApi && o.apiEnv === env));
  const refreshed = [];
  for (const order of orders) {
    if (order.isLiveApi && !FINAL_STATUSES.includes(order.status)) {
      try { refreshed.push(await refreshLiveOrder(order.orderId)); }
      catch (err: any) { refreshed.push({ ...order, syncWarning: `Não foi possível atualizar: ${err.message}` }); }
    } else refreshed.push(order);
  }
  return NextResponse.json({ orders: refreshed });
}

function contact(input: any, stopId: string) {
  const name = String(input?.name || '').trim();
  const rawPhone = String(input?.phone || '').replace(/\D/g, '');
  const phone = rawPhone.startsWith('55') && rawPhone.length >= 12 ? rawPhone : `55${rawPhone}`;
  if (!name || !/^55\d{10,11}$/.test(phone)) throw new Error('Preencha nome e telefone válido com DDD de cada contato.');
  return { stopId, name, phone: `+${phone}`, ...(input.remarks ? { remarks: String(input.remarks).slice(0, 1500) } : {}) };
}

export async function POST(request: Request) {
  let lockedId: string | undefined;
  let submissionId: string | undefined;
  let receivedOrderId: string | undefined;
  try {
    const { quotationId, sender, recipients, remarks } = await request.json();
    const quote = getQuotationById(quotationId);
    if (!quote?.isLiveApi || quote.apiEnv !== getLalamoveConfig().env || quote.stops.some(s => !s.stopId)) {
      return NextResponse.json({ error: 'Solicite uma cotação oficial válida antes de contratar.' }, { status: 400 });
    }
    const existing = getAllOrders().find(o => o.quotationId === quotationId && o.isLiveApi && o.apiEnv === quote.apiEnv);
    if (existing) return NextResponse.json(existing);
    if (inFlight.has(quotationId)) return NextResponse.json({ error: 'Este pedido já está sendo enviado. Aguarde e atualize a lista de entregas.' }, { status: 409 });
    if (Date.parse(quote.expiresAt) <= Date.now()) return NextResponse.json({ error: 'Cotação expirada. Solicite uma nova cotação.' }, { status: 409 });
    if (!Array.isArray(recipients) || recipients.length !== quote.stops.length - 1 ||
        sender?.stopId !== quote.stops[0].stopId ||
        recipients.some((r: any, i: number) => r.stopId !== quote.stops[i + 1].stopId)) {
      return NextResponse.json({ error: 'Os contatos devem corresponder às paradas da cotação.' }, { status: 400 });
    }
    let contacts;
    try { contacts = [contact(sender, quote.stops[0].stopId!), ...recipients.map((r: any, i: number) => contact(r, quote.stops[i + 1].stopId!))]; }
    catch (err: any) { return NextResponse.json({ error: err.message }, { status: 400 }); }
    if (!beginOrderSubmission(quotationId)) {
      return NextResponse.json({ error: 'Esta cotação já foi enviada. Confira os pedidos no portal Lalamove e sincronize o ID antes de tentar novamente.' }, { status: 409 });
    }
    submissionId = quotationId;
    inFlight.add(quotationId); lockedId = quotationId;
    const result = await makeLalamoveRequest('POST', '/v3/orders', { data: {
      quotationId, sender: contacts[0], recipients: contacts.slice(1), isPODEnabled: true,
    } });
    receivedOrderId = result?.data?.orderId;
    const order = mapLiveOrder(result.data, undefined, quote);
    order.createdAt ||= new Date().toISOString();
    order.remarks = remarks;
    order.stops = order.stops.map((s, i) => ({ ...s, clientName: contacts[i].name,
      clientPhone: contacts[i].phone, remarks: contacts[i].remarks }));
    saveOrder(order);
    clearOrderSubmission(quotationId);
    submissionId = undefined;
    return NextResponse.json(order, { status: 201 });
  } catch (err: any) {
    if (submissionId) {
      if (err instanceof LalamoveApiError && err.status >= 400 && err.status < 500) {
        clearOrderSubmission(submissionId);
      } else {
        return NextResponse.json({ error: receivedOrderId
          ? `A Lalamove criou o pedido #${receivedOrderId}, mas não foi possível salvá-lo localmente. Sincronize esse ID; não contrate outra corrida.`
          : 'Não foi possível confirmar a resposta da Lalamove. Confira o portal e sincronize o pedido antes de contratar outra corrida.',
          orderId: receivedOrderId, submissionUncertain: true }, { status: 502 });
      }
    }
    return NextResponse.json({ error: err.message || 'Erro ao criar pedido na Lalamove.' }, { status: lalamoveErrorStatus(err) });
  } finally { if (lockedId) inFlight.delete(lockedId); }
}
