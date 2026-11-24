import { NextResponse } from 'next/server';
import {
  makeLalamoveRequest,
  simulateQuotationAsync,
} from '@/lib/lalamove-client';
import { QuotationRequest, QuotationResponse, Coordinates } from '@/types/lalamove';
import { saveQuotation } from '@/lib/storage';

// Cache conhecido de coordenadas de São Paulo
const KNOWN_COORDS: Record<string, Coordinates> = {
  'glicerio': { lat: '-23.556780', lng: '-46.628890' },
  'paulista': { lat: '-23.561684', lng: '-46.655981' },
};

async function resolveCoordinatesForAddress(address: string, existingCoords?: Coordinates): Promise<Coordinates> {
  // Se já tem coordenadas válidas e não são as padrão repetidas de fallback
  if (existingCoords?.lat && existingCoords?.lng && existingCoords.lat !== '-23.561684') {
    return existingCoords;
  }

  // Tenta geocodificar o endereço de texto usando Nominatim
  try {
    const query = `${address} São Paulo Brasil`.trim();
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: { 'User-Agent': 'LalamoveExpressApp/1.0' },
        next: { revalidate: 86400 },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: Number(data[0].lat).toFixed(6),
          lng: Number(data[0].lon).toFixed(6),
        };
      }
    }
  } catch (e) {
    console.warn('Geocoding fallback for address:', address);
  }

  return existingCoords || { lat: '-23.550520', lng: '-46.633308' };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reqData: QuotationRequest = body.data || body;

    if (!reqData.stops || reqData.stops.length < 2) {
      return NextResponse.json(
        { error: 'São necessárias pelo menos 2 paradas (Origem e 1 Destino).' },
        { status: 400 }
      );
    }

    // Garante que cada parada tenha coordenadas geocodificadas reais correspondentes ao endereço
    const resolvedStops = await Promise.all(
      reqData.stops.map(async (stop, idx) => {
        // Se for a origem (Glicério 557), usa cache da matriz
        if (idx === 0 && stop.address.toLowerCase().includes('glic')) {
          return {
            ...stop,
            coordinates: KNOWN_COORDS.glicerio,
          };
        }

        const coords = await resolveCoordinatesForAddress(stop.address, stop.coordinates);
        return {
          ...stop,
          coordinates: coords,
        };
      })
    );

    reqData.stops = resolvedStops;

    let quoteResult: QuotationResponse | null = null;
    let isLiveApi = false;

    // Tenta chamada real à API da Lalamove v3 (Produção ou Sandbox)
    try {
      const lalamovePayload = {
        data: {
          serviceType: reqData.serviceType,
          specialRequests: reqData.specialRequests || [],
          language: reqData.language || 'pt_BR',
          isRouteOptimized: reqData.isRouteOptimized,
          stops: reqData.stops.map((s) => ({
            coordinates: {
              lat: String(s.coordinates.lat),
              lng: String(s.coordinates.lng),
            },
            address: s.address,
          })),
          item: reqData.item || {
            quantity: '10',
            weight: 'LESS_THAN_100KG',
            categories: ['OFFICE_SUPPLIES'],
            handlingInstructions: ['KEEP_DRY'],
          },
        },
      };

      const realResponse = await makeLalamoveRequest(
        'POST',
        '/v3/quotations',
        lalamovePayload
      );

      if (realResponse && realResponse.data) {
        const d = realResponse.data;
        const total = d.priceBreakdown?.total || '0.00';
        const numTotal = parseFloat(total);
        isLiveApi = true;

        quoteResult = {
          quotationId: d.quotationId,
          serviceType: d.serviceType,
          deliveryTier: reqData.deliveryTier || 'REGULAR',
          scheduleAt: d.scheduleAt,
          expiresAt: d.expiresAt,
          priceBreakdown: {
            currency: d.priceBreakdown?.currency || 'BRL',
            base: d.priceBreakdown?.base || '0.00',
            extraMileage: d.priceBreakdown?.extraMileage || '0.00',
            surcharge: d.priceBreakdown?.surcharge || '0.00',
            total: total,
            priorityPrice: (numTotal * 1.4736).toFixed(2),
            regularPrice: total,
            pooledPrice: (numTotal * 0.8106).toFixed(2),
          },
          distance: {
            value: d.distance?.value || '0',
            text: `${(Number(d.distance?.value || 0) / 1000).toFixed(1)} km`,
          },
          stops: d.stops || reqData.stops,
          isRouteOptimized: reqData.isRouteOptimized,
          isLiveApi: true,
          createdAt: new Date().toISOString(),
        };
      }
    } catch (apiError: any) {
      console.warn('Live Lalamove API call notice:', apiError.message);
    }

    // Se não há chave real configurada, usa o simulador calibrado por malha viária OSRM
    if (!quoteResult) {
      quoteResult = await simulateQuotationAsync(reqData);
      quoteResult.isLiveApi = false;
    }

    saveQuotation(quoteResult);

    return NextResponse.json(quoteResult);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao processar cotação Lalamove' },
      { status: 500 }
    );
  }
}
