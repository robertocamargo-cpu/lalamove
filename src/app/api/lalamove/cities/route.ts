import { NextResponse } from 'next/server';
import { makeLalamoveRequest } from '@/lib/lalamove-client';

export async function GET() {
  try {
    const liveCities = await makeLalamoveRequest('GET', '/v3/cities');
    if (liveCities && liveCities.data) {
      return NextResponse.json(liveCities);
    }
  } catch (apiErr: any) {
    console.warn('Get cities live API notice:', apiErr.message);
  }

  // Fallback estruturado de São Paulo
  return NextResponse.json({
    data: [
      {
        locode: 'BR SAO',
        name: 'São Paulo & Campinas',
        services: [
          { key: 'LALAPRO', description: 'Motos com baú fechado. Proteção contra intempéries e chuva.', load: { value: '20', unit: 'kg' } },
          { key: 'LALAGO', description: 'Motos sem baú para envelopes e pequenos volumes.', load: { value: '20', unit: 'kg' } },
          { key: 'HATCHBACK', description: 'Carro Hatch para compras e volumes médios.', load: { value: '200', unit: 'kg' } },
          { key: 'CAR', description: 'Carro Sedan com porta-malas espaçoso.', load: { value: '300', unit: 'kg' } },
          { key: 'UV_FIORINO', description: 'Utilitário Fiorino / Utilitário pequeno para caixas.', load: { value: '500', unit: 'kg' } },
          { key: 'VAN', description: 'Van de Carga para móveis e grandes lotes de descartáveis.', load: { value: '1000', unit: 'kg' } },
          { key: 'TRUCK330', description: 'Caminhão 3/4 Baú para cargas paletizadas.', load: { value: '1500', unit: 'kg' } },
        ],
      },
    ],
  });
}
