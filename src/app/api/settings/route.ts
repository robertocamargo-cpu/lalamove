import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getLalamoveConfig } from '@/lib/lalamove-client';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getLalamoveConfig();
  return NextResponse.json({
    maskedKey: config.apiKey ? `${config.apiKey.slice(0, 7)}…${config.apiKey.slice(-4)}` : '',
    hasSecret: !!config.apiSecret, env: config.env, market: config.market, mockFallback: false,
    isRealKeyConfigured: config.apiKey.startsWith('pk_prod_') && config.apiSecret.startsWith('sk_prod_'),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = getLalamoveConfig();
    const env = body.env || config.env;
    if (!['production', 'sandbox'].includes(env)) return NextResponse.json({ error: 'Ambiente inválido.' }, { status: 400 });
    const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : config.apiKey;
    const apiSecret = typeof body.apiSecret === 'string' && body.apiSecret.trim() ? body.apiSecret.trim() : config.apiSecret;
    const prefix = env === 'production' ? 'prod' : 'test';
    if (!apiKey.startsWith(`pk_${prefix}_`) || !apiSecret.startsWith(`sk_${prefix}_`) || /[\r\n]/.test(apiKey + apiSecret)) {
      return NextResponse.json({ error: 'As chaves devem corresponder ao ambiente selecionado.' }, { status: 400 });
    }
    const values = { LALAMOVE_API_KEY: apiKey, LALAMOVE_API_SECRET: apiSecret,
      LALAMOVE_ENV: env, LALAMOVE_MARKET: 'BR', LALAMOVE_MOCK_FALLBACK: 'false' };
    // Mantém as demais configurações; .env é o arquivo solicitado para as credenciais.
    // Remove overrides apenas dessas chaves no .env.local.
    const envPath = path.join(process.cwd(), '.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    for (const [key, value] of Object.entries(values)) {
      const line = `${key}=${JSON.stringify(value)}`;
      const pattern = new RegExp(`^${key}=.*$`, 'm');
      content = pattern.test(content) ? content.replace(pattern, () => line) : content + `\n${line}`;
    }
    fs.writeFileSync(envPath, content, { encoding: 'utf8', mode: 0o600 });
    fs.chmodSync(envPath, 0o600);
    const localPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(localPath)) {
      const local = fs.readFileSync(localPath, 'utf8').split('\n').filter(line => !Object.keys(values).some(key => line.startsWith(key + '='))).join('\n');
      fs.writeFileSync(localPath, local, { encoding: 'utf8', mode: 0o600 });
    }
    Object.assign(process.env, values);
    return NextResponse.json({ success: true, message: 'Configurações salvas.', isRealKeyConfigured: env === 'production' });
  } catch (err: any) { return NextResponse.json({ error: err.message || 'Erro ao salvar configurações.' }, { status: 500 }); }
}
