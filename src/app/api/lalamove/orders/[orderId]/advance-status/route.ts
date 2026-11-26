import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Simulação desativada. Os status são atualizados exclusivamente pela Lalamove.' }, { status: 410 });
}
