import { NextResponse } from 'next/server';
import { makeLalamoveRequest, lalamoveErrorStatus } from '@/lib/lalamove-client';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: { quotationId: string } }) {
  try {
    const { data } = await makeLalamoveRequest('GET', `/v3/quotations/${encodeURIComponent(params.quotationId)}`);
    return NextResponse.json(data);
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: lalamoveErrorStatus(err) }); }
}
