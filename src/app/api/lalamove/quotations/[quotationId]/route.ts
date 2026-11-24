import { NextResponse } from 'next/server';
import { makeLalamoveRequest } from '@/lib/lalamove-client';
import { getQuotationById } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: { quotationId: string } }
) {
  const { quotationId } = params;

  try {
    const liveQuote = await makeLalamoveRequest('GET', `/v3/quotations/${quotationId}`);
    if (liveQuote && liveQuote.data) {
      return NextResponse.json(liveQuote.data);
    }
  } catch (apiErr: any) {
    console.warn('Get quotation live API notice:', apiErr.message);
  }

  const localQuote = getQuotationById(quotationId);
  if (localQuote) {
    return NextResponse.json(localQuote);
  }

  return NextResponse.json({ error: 'Cotação não encontrada.' }, { status: 404 });
}
