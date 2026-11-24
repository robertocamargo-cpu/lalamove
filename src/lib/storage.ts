import fs from 'fs';
import path from 'path';
import { Order, QuotationResponse } from '@/types/lalamove';

const DATA_DIR = path.join(process.cwd(), 'data');
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
  } catch (e) {
    console.error('Erro ao ler orders.json do disco:', e);
  }
  return [];
}

function saveOrdersToDisk(orders: Order[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar orders.json no disco:', e);
  }
}

function loadQuotesFromDisk(): QuotationResponse[] {
  try {
    ensureDataDir();
    if (fs.existsSync(QUOTES_FILE)) {
      const content = fs.readFileSync(QUOTES_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error('Erro ao ler quotes.json do disco:', e);
  }
  return [];
}

function saveQuotesToDisk(quotes: QuotationResponse[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(QUOTES_FILE, JSON.stringify(quotes, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao salvar quotes.json no disco:', e);
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
