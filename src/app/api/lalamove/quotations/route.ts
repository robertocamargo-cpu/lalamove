import { NextResponse } from 'next/server';
import { makeLalamoveRequest, getLalamoveConfig, lalamoveErrorStatus } from '@/lib/lalamove-client';
import { geocodeAddress, hasValidCoordinates } from '@/lib/geocode';
import { QuotationRequest, QuotationResponse } from '@/types/lalamove';
import { saveQuotation } from '@/lib/storage';

const TIER_CODES = { REGULAR: '1', PRIORITY: '2', POOLED: '3' } as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input: QuotationRequest = body.data || body;
    if (!Array.isArray(input.stops) || input.stops.length < 2 || input.stops.length > 16 ||
        input.stops.some(s => !s.address?.trim())) {
      return NextResponse.json({ error: 'Informe de 2 a 16 paradas com endereço completo.' }, { status: 400 });
    }
    const tier = input.deliveryTier || 'REGULAR';
    if (!(tier in TIER_CODES)) return NextResponse.json({ error: 'Modalidade inválida.' }, { status: 400 });
    if (input.scheduleAt && (!Number.isFinite(Date.parse(input.scheduleAt)) || Date.parse(input.scheduleAt) <= Date.now())) {
      return NextResponse.json({ error: 'O agendamento deve ser uma data futura.' }, { status: 400 });
    }
    const stops: QuotationRequest['stops'] = [];
    // Geocodificação sequencial para não disparar consultas simultâneas ao serviço.
    for (const stop of input.stops) {
      try {
        stops.push({ address: stop.address, coordinates: hasValidCoordinates(stop.coordinates)
          ? stop.coordinates : await geocodeAddress(stop.address, stop) });
      } catch (err: any) {
        const index = input.stops.indexOf(stop);
        return NextResponse.json({ error: `${index === 0 ? 'Origem' : `Destino ${index}`}: ${err.message}` }, { status: 422 });
      }
    }
    const result = await makeLalamoveRequest('POST', '/v3/quotations', { data: {
      serviceType: input.serviceType,
      pricingTierCode: TIER_CODES[tier],
      specialRequests: input.specialRequests || [],
      language: input.language || 'pt_BR',
      isRouteOptimized: input.isRouteOptimized,
      stops,
      ...(input.scheduleAt ? { scheduleAt: new Date(input.scheduleAt).toISOString() } : {}),
      // item é restrito a mercados asiáticos na API v3; não enviar enums locais no Brasil.
    } });
    const d = result.data;
    if (!d.quotationId || !d.expiresAt || !d.priceBreakdown?.total || !Array.isArray(d.stops) ||
        d.stops.length !== stops.length || d.stops.some((s: any) => !s.stopId)) {
      throw new Error('A Lalamove retornou uma cotação incompleta. Solicite outra cotação.');
    }
    const used = new Set<number>();
    const mappedStops = d.stops.map((stop: any, index: number) => {
      const originalIndex = stops.findIndex((s, i) => !used.has(i) &&
        Number(s.coordinates.lat).toFixed(6) === Number(stop.coordinates?.lat).toFixed(6) &&
        Number(s.coordinates.lng).toFixed(6) === Number(stop.coordinates?.lng).toFixed(6));
      if (originalIndex < 0) throw new Error('Não foi possível associar as paradas da cotação aos destinatários.');
      used.add(originalIndex);
      return { ...stop, originalIndex, optimizedIndex: index };
    });
    const quote: QuotationResponse = {
      quotationId: String(d.quotationId), serviceType: d.serviceType || input.serviceType,
      deliveryTier: tier, scheduleAt: input.scheduleAt ? d.scheduleAt || input.scheduleAt : undefined,
      expiresAt: d.expiresAt, priceBreakdown: d.priceBreakdown,
      distance: { value: String(d.distance?.value || '0'), text: d.distance
        ? `${(Number(d.distance.value) / 1000).toFixed(1)} km` : 'Não informada' },
      stops: mappedStops, isRouteOptimized: input.isRouteOptimized,
      isLiveApi: true, apiEnv: getLalamoveConfig().env, createdAt: new Date().toISOString(),
    };
    saveQuotation(quote);
    return NextResponse.json(quote);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao consultar cotação Lalamove.' }, { status: lalamoveErrorStatus(err) });
  }
}
