import { NextResponse } from 'next/server';
import { makeLalamoveRequest, lalamoveErrorStatus } from '@/lib/lalamove-client';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json(await makeLalamoveRequest('GET', '/v3/cities')); }
  catch (err: any) { return NextResponse.json({ error: err.message }, { status: lalamoveErrorStatus(err) }); }
}
