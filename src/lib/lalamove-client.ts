import crypto from 'crypto';
export interface LalamoveConfig {
  apiKey: string;
  apiSecret: string;
  env: 'sandbox' | 'production';
  market: string;
  mockFallback: boolean;
}

export function getLalamoveConfig(): LalamoveConfig {
  const env = process.env.LALAMOVE_ENV || 'production';
  if (env !== 'production' && env !== 'sandbox') throw new Error('Ambiente Lalamove inválido.');
  const mockFallback = false;

  return {
    apiKey: process.env.LALAMOVE_API_KEY || '',
    apiSecret: process.env.LALAMOVE_API_SECRET || '',
    env,
    market: process.env.LALAMOVE_MARKET || 'BR',
    mockFallback,
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

  if (isMockKey) {
    throw new Error(
      'Credenciais da Lalamove não configuradas. Defina LALAMOVE_API_KEY e LALAMOVE_API_SECRET válidas para o ambiente de produção.'
    );
  }

  const prefix = config.env === 'production' ? 'prod' : 'test';
  if (!config.apiKey.startsWith(`pk_${prefix}_`) || !config.apiSecret.startsWith(`sk_${prefix}_`)) {
    throw new Error(`As credenciais cadastradas não correspondem ao ambiente ${config.env}.`);
  }

  const baseUrl = getBaseUrl(config.env);
  const url = `${baseUrl}${path}`;
  const body = payload ? JSON.stringify(payload) : '';
  const headers = getLalamoveHeaders(method, path, body, config);

  const res = await fetch(url, {
    method,
    headers,
    body: payload ? body : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new LalamoveApiError(res.status, data?.message || data?.errors?.[0]?.message || data?.errors?.[0]?.id || res.statusText);
  }

  if (res.status !== 204 && !data?.data) throw new Error('Resposta inválida da Lalamove.');
  return data;
}

export class LalamoveApiError extends Error {
  constructor(public status: number, message: string) {
    super(`Lalamove [${status}]: ${message}`);
  }
}

export function lalamoveErrorStatus(error: unknown): number {
  return error instanceof LalamoveApiError && [400, 402, 403, 404, 409, 422, 429].includes(error.status)
    ? error.status : 502;
}
