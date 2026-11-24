import { NextResponse } from 'next/server';

// Coordenadas padrão em cache para ganhos de performance e confiabilidade
const KNOWN_COORDINATES: Record<string, { lat: string; lng: string }> = {
  '01514-001': { lat: '-23.556780', lng: '-46.628890' }, // Rua do Glicério 557 (Expedição Matriz)
  '01514001': { lat: '-23.556780', lng: '-46.628890' },
  '01310-100': { lat: '-23.561684', lng: '-46.655981' }, // Av Paulista 1000
  '01310100': { lat: '-23.561684', lng: '-46.655981' },
  '04094-050': { lat: '-23.587416', lng: '-46.657634' }, // Ibirapuera / Pedro Álvares Cabral
  '04094050': { lat: '-23.587416', lng: '-46.657634' },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address') || '';
  const cep = (searchParams.get('cep') || '').replace(/\D/g, '');

  if (!address && !cep) {
    return NextResponse.json(
      { error: 'Parâmetro address ou cep é obrigatório.' },
      { status: 400 }
    );
  }

  // Verifica cache conhecido
  if (cep && KNOWN_COORDINATES[cep]) {
    return NextResponse.json({
      coordinates: KNOWN_COORDINATES[cep],
      source: 'cache_fast',
    });
  }

  try {
    // Tenta geocodificação via OpenStreetMap Nominatim
    const query = `${address} São Paulo Brasil`.trim();
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'LalamoveExpressNapkins/1.0',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return NextResponse.json({
          coordinates: {
            lat: Number(data[0].lat).toFixed(6),
            lng: Number(data[0].lon).toFixed(6),
          },
          formattedAddress: data[0].display_name,
          source: 'nominatim',
        });
      }
    }
  } catch (err) {
    console.warn('Nominatim lookup failed, falling back to heuristic coords', err);
  }

  // Fallback inteligente para região metropolitana de SP baseado em hash da string
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 1000) / 10000) * 0.12 - 0.06;
  const offsetLng = (((Math.abs(hash) >> 3) % 1000) / 10000) * 0.12 - 0.06;

  const fallbackLat = (-23.55052 + offsetLat).toFixed(6);
  const fallbackLng = (-46.633308 + offsetLng).toFixed(6);

  return NextResponse.json({
    coordinates: {
      lat: fallbackLat,
      lng: fallbackLng,
    },
    source: 'sp_metro_fallback',
  });
}

