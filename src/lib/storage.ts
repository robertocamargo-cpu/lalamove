import fs from 'fs';
import path from 'path';
import { Order, QuotationResponse } from '@/types/lalamove';

const DATA_DIR = process.env.LALAMOVE_DATA_DIR || path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const QUOTES_FILE = path.join(DATA_DIR, 'quotes.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadOrdersFromDisk(): Order[] {
  try {
    ensureDataDir();
    if (fs.existsSync(ORDERS_FILE)) {
      const content = fs.readFileSync(ORDERS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) { throw new Error('Não foi possível ler os pedidos salvos.'); }
  return [];
}

function saveOrdersToDisk(orders: Order[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(ORDERS_FILE + '.tmp', JSON.stringify(orders, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(ORDERS_FILE + '.tmp', ORDERS_FILE);
  } catch (e) {
    throw new Error('Não foi possível salvar o pedido. Confira a Lalamove antes de repetir a contratação.');
  }
}

function loadQuotesFromDisk(): QuotationResponse[] {
  try {
    ensureDataDir();
    if (fs.existsSync(QUOTES_FILE)) {
      const content = fs.readFileSync(QUOTES_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) { throw new Error('Não foi possível ler as cotações salvas.'); }
  return [];
}

function saveQuotesToDisk(quotes: QuotationResponse[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(QUOTES_FILE + '.tmp', JSON.stringify(quotes, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(QUOTES_FILE + '.tmp', QUOTES_FILE);
  } catch (e) {
    throw new Error('Não foi possível salvar a cotação.');
  }
}

export function saveQuotation(quote: QuotationResponse) {
  const quotes = loadQuotesFromDisk();
  quotes.unshift(quote);
  const trimmed = quotes.slice(0, 100);
  saveQuotesToDisk(trimmed);
}

export function getQuotationById(quotationId: string): QuotationResponse | undefined {
  const quotes = loadQuotesFromDisk();
  return quotes.find((q) => q.quotationId === quotationId);
}

export function saveOrder(order: Order) {
  const orders = loadOrdersFromDisk();
  const existingIdx = orders.findIndex((o) => o.orderId === order.orderId);
  if (existingIdx >= 0) {
    orders[existingIdx] = order;
  } else {
    orders.unshift(order);
  }
  saveOrdersToDisk(orders);
}

export function saveMultipleOrders(newOrders: Order[]) {
  let orders = loadOrdersFromDisk();
  // Remove registros artificiais criados pelo importador antigo antes de gravar IDs reais.
  if (newOrders.some((o) => o.remarks === 'Importado dos Registros Lalamove')) {
    orders = orders.filter((o) => !o.orderId.startsWith('lala_'));
  }
  for (const o of newOrders) {
    const idx = orders.findIndex((x) => x.orderId === o.orderId);
    if (idx >= 0) {
      // O CSV não deve substituir dados já confirmados pela API.
      if (o.source === 'csv' && orders[idx].isLiveApi) continue;
      orders[idx] = o;
    } else {
      orders.unshift(o);
    }
  }
  saveOrdersToDisk(orders);
}

export function getOrderById(orderId: string): Order | undefined {
  const orders = loadOrdersFromDisk();
  return orders.find((o) => o.orderId === orderId);
}

export function getAllOrders(): Order[] {
  return loadOrdersFromDisk();
}

// Uma resposta perdida não autoriza reenviar automaticamente um pedido pago.
export function beginOrderSubmission(quotationId: string): boolean {
  const dir = path.join(DATA_DIR, 'submissions');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try {
    fs.writeFileSync(path.join(dir, encodeURIComponent(quotationId) + '.json'),
      JSON.stringify({ quotationId, submittedAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
    return true;
  } catch (err: any) {
    if (err.code === 'EEXIST') return false;
    throw err;
  }
}

export function clearOrderSubmission(quotationId: string) {
  fs.rmSync(path.join(DATA_DIR, 'submissions', encodeURIComponent(quotationId) + '.json'), { force: true });
}
