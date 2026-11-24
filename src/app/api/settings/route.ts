import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const envPath = path.join(process.cwd(), '.env.local');
  let apiKey = process.env.LALAMOVE_API_KEY || '';
  let apiSecret = process.env.LALAMOVE_API_SECRET || '';
  let env = process.env.LALAMOVE_ENV || 'sandbox';
  let market = process.env.LALAMOVE_MARKET || 'BR';
  let mockFallback = process.env.LALAMOVE_MOCK_FALLBACK !== 'false';

  // Oculta parte da chave por segurança se não for chave de teste
  const maskedKey = apiKey.includes('test_key')
    ? apiKey
    : apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : '';

  return NextResponse.json({
    apiKey,
    maskedKey,
    hasSecret: !!apiSecret && !apiSecret.includes('test_secret'),
    env,
    market,
    mockFallback,
    isRealKeyConfigured: !!apiKey && !apiKey.includes('test_key') && !apiKey.includes('sua_api_key'),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, apiSecret, env, market, mockFallback } = body;

    const envPath = path.join(process.cwd(), '.env.local');

    const newEnvContent = `# Configurações da API Lalamove v3 geradas pelo painel
LALAMOVE_API_KEY=${apiKey || ''}
LALAMOVE_API_SECRET=${apiSecret || ''}
LALAMOVE_ENV=${env || 'sandbox'}
LALAMOVE_MARKET=${market || 'BR'}
LALAMOVE_MOCK_FALLBACK=${mockFallback ? 'true' : 'false'}
`;

    fs.writeFileSync(envPath, newEnvContent, 'utf-8');

    // Atualiza variáveis em tempo de execução
    process.env.LALAMOVE_API_KEY = apiKey || '';
    process.env.LALAMOVE_API_SECRET = apiSecret || '';
    process.env.LALAMOVE_ENV = env || 'sandbox';
    process.env.LALAMOVE_MARKET = market || 'BR';
    process.env.LALAMOVE_MOCK_FALLBACK = mockFallback ? 'true' : 'false';

    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso!',
      isRealKeyConfigured: !!apiKey && !apiKey.includes('test_key') && !apiKey.includes('sua_api_key'),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao salvar configurações' },
      { status: 500 }
    );
  }
}

