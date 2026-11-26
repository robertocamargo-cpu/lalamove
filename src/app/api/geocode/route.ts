import { NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address') || '';
  try {
    return NextResponse.json({ coordinates: await geocodeAddress(address), source: 'geocoding' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
