import crypto from 'crypto';
import {
  LalamoveServiceType,
  DeliveryTier,
  QuotationRequest,
  QuotationResponse,
  Order,
  OrderStatus,
} from '@/types/lalamove';
import { LALAMOVE_VEHICLES } from './cubage';

export interface LalamoveConfig {
  apiKey: string;
  apiSecret: string;
  env: 'sandbox' | 'production';
  market: string;
  mockFallback: boolean;
}

export function getLalamoveConfig(): LalamoveConfig {
  return {
    apiKey: process.env.LALAMOVE_API_KEY || '',
    apiSecret: process.env.LALAMOVE_API_SECRET || '',
    env: (process.env.LALAMOVE_ENV as 'sandbox' | 'production') || 'sandbox',
    market: process.env.LALAMOVE_MARKET || 'BR',
    mockFallback: process.env.LALAMOVE_MOCK_FALLBACK !== 'false',
  };
}

export function getBaseUrl(env: 'sandbox' | 'production'): string {
  return env === 'production'
    ? 'https://rest.lalamove.com'
    : 'https://rest.sandbox.lalamove.com';
}

export function generateHmacSignature(
  timestamp: number,
  method: string,
  path: string,
  body: string,
  secret: string
): string {
  const rawSignature = `${timestamp}\r\n${method.toUpperCase()}\r\n${path}\r\n\r\n${body}`;
  return crypto.createHmac('sha256', secret).update(rawSignature).digest('hex');
}

export function getLalamoveHeaders(
  method: string,
  path: string,
  body: string = '',
  config: LalamoveConfig
) {
  const timestamp = Date.now();
  const signature = generateHmacSignature(timestamp, method, path, body, config.apiSecret);
  const requestId = crypto.randomUUID();

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `hmac ${config.apiKey}:${timestamp}:${signature}`,
    Market: config.market,
    'Request-ID': requestId,
  };
}

export async function makeLalamoveRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  payload?: any
) {
  const config = getLalamoveConfig();

  const isMockKey =
    !config.apiKey ||
    !config.apiSecret ||
    config.apiKey.includes('test_key') ||
    config.apiKey.includes('sua_api_key');

  if (isMockKey && config.mockFallback) {
    return null;
  }

  const baseUrl = getBaseUrl(config.env);
  const url = `${baseUrl}${path}`;
  const body = payload ? JSON.stringify(payload) : '';
  const headers = getLalamoveHeaders(method, path, body, config);

  const res = await fetch(url, {
    method,
    headers,
    body: payload ? body : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      `Lalamove API Error [${res.status}]: ${
        data?.message || data?.errors?.[0]?.message || res.statusText
      }`
    );
  }

  return data;
}

/**
 * ObtÃ©m a distÃ¢ncia viÃ¡ria real (traÃ§ado de trÃ¢nsito em SÃ£o Paulo) via OSRM.
 */
export async function getStreetDrivingDistanceKm(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): Promise<number> {
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res = await fetch(osrmUrl, { next: { revalidate: 86400 } });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]?.distance) {
        return Number((data.routes[0].distance / 1000).toFixed(1));
      }
    }
  } catch (err) {
    // Fallback
  }

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c * 1.55).toFixed(1));
}

/**
 * SimulaÃ§Ã£o de CotaÃ§Ã£o calibrada com a curva real da Lalamove SÃ£o Paulo
 */
export async function simulateQuotationAsync(req: QuotationRequest): Promise<QuotationResponse> {
  const stops = req.stops;
  const vehicle = LALAMOVE_VEHICLES[req.serviceType] || LALAMOVE_VEHICLES.LALAPRO;
  const selectedTier = req.deliveryTier || 'REGULAR';

  let totalKmManual = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const p1 = stops[i].coordinates;
    const p2 = stops[i + 1].coordinates;
    const km = await getStreetDrivingDistanceKm(
      parseFloat(p1.lng || '-46.62889'),
      parseFloat(p1.lat || '-23.55678'),
      parseFloat(p2.lng || '-46.65598'),
      parseFloat(p2.lat || '-23.56168')
    );
    totalKmManual += km;
  }
  totalKmManual = Math.max(1.0, Number(totalKmManual.toFixed(1)));

  let totalKm = totalKmManual;
  let kmSaved = 0;
  let priceSaved = 0;

  let orderedStops = stops.map((s, idx) => ({
    coordinates: s.coordinates,
    address: s.address,
    originalIndex: idx,
    optimizedIndex: idx,
  }));

  if (req.isRouteOptimized && stops.length > 2) {
    const origin = orderedStops[0];
    const destinations = orderedStops.slice(1);
    
    destinations.sort((a, b) => {
      const latOrig = parseFloat(origin.coordinates.lat);
      const lngOrig = parseFloat(origin.coordinates.lng);
      const distA = Math.hypot(parseFloat(a.coordinates.lat) - latOrig, parseFloat(a.coordinates.lng) - lngOrig);
      const distB = Math.hypot(parseFloat(b.coordinates.lat) - latOrig, parseFloat(b.coordinates.lng) - lngOrig);
      return distA - distB;
    });

    orderedStops = [origin, ...destinations].map((s, idx) => ({
      ...s,
      optimizedIndex: idx,
    }));

    kmSaved = Number((totalKmManual * 0.14).toFixed(1));
    totalKm = Number((totalKmManual - kmSaved).toFixed(1));
    priceSaved = Number((kmSaved * vehicle.pricePerKmBrl).toFixed(2));
  }

  // Tabela oficial Lalamove SP:
  // Base cobre o 1Âº km (11.50).
  // A taxa por km adicional Ã© regressiva: R$ 2.20/km em rotas curtas e R$ 1.94/km em rotas mais longas
  const basePrice = vehicle.baseRateBrl;
  const extraKm = Math.max(0, totalKm - 1.0);
  
  // Taxa por km decrescente com a distÃ¢ncia (curva oficial Lalamove)
  const dynamicPerKmRate = Math.max(1.94, Number((2.26 - totalKm * 0.021).toFixed(3)));
  const extraMileagePrice = Number((extraKm * dynamicPerKmRate).toFixed(2));
  
  const additionalStopsCount = Math.max(0, stops.length - 2);
  let surcharge = additionalStopsCount * vehicle.stopFeeBrl;

  if (req.specialRequests?.includes('HELP_LOADING_UNLOADING')) {
    surcharge += 45.0;
  }
  if (req.specialRequests?.includes('RETURN_TRIP')) {
    surcharge += basePrice * 0.7;
  }

  const regularTotal = Number((basePrice + extraMileagePrice + surcharge).toFixed(2));
  
  // Ratios oficiais do site da Lalamove:
  // Prioridade: ~1.4763x
  // Agrupado: ~0.8096x
  const priorityTotal = Number((regularTotal * 1.4763).toFixed(2));
  const pooledTotal = Number((regularTotal * 0.8096).toFixed(2));

  let finalPrice = regularTotal;
  if (selectedTier === 'PRIORITY') finalPrice = priorityTotal;
  if (selectedTier === 'POOLED') finalPrice = pooledTotal;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  return {
    quotationId: `quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    serviceType: req.serviceType,
    deliveryTier: selectedTier,
    scheduleAt: req.scheduleAt,
    expiresAt,
    priceBreakdown: {
      currency: 'BRL',
      base: basePrice.toFixed(2),
      extraMileage: extraMileagePrice.toFixed(2),
      surcharge: surcharge.toFixed(2),
      total: finalPrice.toFixed(2),
      priorityPrice: priorityTotal.toFixed(2),
      regularPrice: regularTotal.toFixed(2),
      pooledPrice: pooledTotal.toFixed(2),
    },
    distance: {
      value: (totalKm * 1000).toString(),
      text: `${totalKm} km`,
    },
    stops: orderedStops,
    isRouteOptimized: req.isRouteOptimized,
    savingsVsManual: req.isRouteOptimized && stops.length > 2 ? {
      kmSaved,
      priceSavedBrl: priceSaved,
    } : undefined,
    isLiveApi: false,
    createdAt: now.toISOString(),
  };
}

