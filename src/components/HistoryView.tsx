'use strict';
'use client';

import React, { useState, useRef } from 'react';
import {
  History,
  DollarSign,
  Route,
  ShieldCheck,
  Download,
  Package,
  Search,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { Order } from '@/types/lalamove';
import { OrderDetailsModal } from './OrderDetailsModal';

interface HistoryViewProps {
  orders: Order[];
  onRefreshOrders?: () => void;
}

export function HistoryView({ orders, onRefreshOrders }: HistoryViewProps) {
  const [syncOrderId, setSyncOrderId] = useState('');
  const [loadingSync, setLoadingSync] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Métricas agregadas
  const totalFreightSpent = orders.reduce(
    (acc, o) => acc + parseFloat(o.priceBreakdown.total || '0'),
    0
  );

  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
  const totalStopsServed = orders.reduce(
    (acc, o) => acc + Math.max(0, o.stops.length - 1),
    0
  );

  // Sincronizar pedido(s) por ID via API oficial Lalamove
  const handleSyncById = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = syncOrderId.trim();
    if (!rawInput) return;

    // Permite colar múltiplos IDs separados por vírgula, espaço ou quebra de linha
    const ids = rawInput
      .split(/[\s,;]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 3);

    if (ids.length === 0) return;

    setLoadingSync(true);
    setSyncMessage(null);

    try {
      const res = await fetch('/api/lalamove/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nenhum pedido localizado na Lalamove com os IDs informados.');
      }

      setSyncMessage({
        type: 'success',
        text: data.message || `${ids.length} pedido(s) sincronizado(s) com sucesso diretamente da Lalamove!`,
      });
      setSyncOrderId('');
      if (onRefreshOrders) onRefreshOrders();
    } catch (err: any) {
      setSyncMessage({
        type: 'error',
        text: err.message || 'Erro ao consultar pedidos.',
      });
    } finally {
      setLoadingSync(false);
    }
  };

  // Importar arquivo CSV exportado da Lalamove ("Registros")
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingSync(true);
    setSyncMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await fetch('/api/lalamove/orders/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvText: text }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Falha ao processar arquivo.');
        }

        setSyncMessage({
          type: 'success',
          text: data.message || 'Envios importados com sucesso!',
        });
        if (onRefreshOrders) onRefreshOrders();
      } catch (err: any) {
        setSyncMessage({
          type: 'error',
          text: err.message || 'Erro ao importar arquivo.',
        });
      } finally {
        setLoadingSync(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleExportCsv = () => {
    if (orders.length === 0) return;

    const headers = [
      'ID Pedido',
      'Data/Hora',
      'Modal',
      'Status',
      'Qtd Paradas',
      'Distância',
      'Valor Total (BRL)',
      'Motorista',
      'Placa',
    ];

    const rows = orders.map((o) => [
      o.orderId,
      new Date(o.createdAt).toLocaleString('pt-BR'),
      o.serviceType,
      o.status,
      o.stops.length - 1,
      o.distanceKm,
      o.priceBreakdown.total,
      o.driver?.name || 'N/A',
      o.driver?.plate || 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lalamove_auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Bloco de Sincronização de Envios da Lalamove */}
      <div className="bg-[#171922] border border-gray-800 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#F26522]" />
              <span>Sincronizar Envios Anteriores via API Oficial Lalamove</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Consulte e traga qualquer pedido realizado na sua conta (informe um ou vários IDs separados por vírgula ou espaço).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={loadingSync}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 text-xs font-semibold transition-colors"
              title="Importar CSV baixado da aba Registros do portal Lalamove"
            >
              <Upload className="w-3.5 h-3.5 text-[#F26522]" />
              <span>Importar Planilha de Registros</span>
            </button>
            <a
              href="https://partnerportal.lalamove.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded bg-gray-800/80 hover:bg-gray-800 transition-colors"
            >
              <span>Portal Lalamove</span>
              <ExternalLink className="w-3 h-3 text-orange-400" />
            </a>
          </div>
        </div>

        {/* Formulário de Busca Direta por ID(s) de Pedido */}
        <form onSubmit={handleSyncById} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Digite um ou mais IDs de pedidos Lalamove (ex: 3635925342855848091, 3635925342855848092...)"
              value={syncOrderId}
              onChange={(e) => setSyncOrderId(e.target.value)}
              className="w-full bg-[#0F1117] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#F26522]"
            />
          </div>
          <button
            type="submit"
            disabled={loadingSync || !syncOrderId.trim()}
            className="px-4 py-2 bg-[#F26522] hover:bg-[#D95314] disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shrink-0"
          >
            {loadingSync ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Consultando na API Lalamove...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Puxar Pedido(s) via API</span>
              </>
            )}
          </button>
        </form>

        {syncMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
              syncMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {syncMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{syncMessage.text}</span>
          </div>
        )}
      </div>

      {/* Cards de Métricas e KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#171922] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Expedido</span>
            <Package className="w-4 h-4 text-[#F26522]" />
          </div>
          <div className="text-2xl font-black text-white">{orders.length} corridas</div>
          <p className="text-[11px] text-gray-500 mt-1">Registros auditados na base</p>
        </div>

        <div className="bg-[#171922] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase">Clientes Atendidos</span>
            <Route className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalStopsServed} entregas</div>
          <p className="text-[11px] text-gray-500 mt-1">Pontos de entrega concluídos</p>
        </div>

        <div className="bg-[#171922] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase">Taxa de Conclusão</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {orders.length > 0
              ? `${Math.round((completedOrders.length / orders.length) * 100)}%`
              : '100%'}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Comprovantes POD arquivados</p>
        </div>

        <div className="bg-[#171922] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase">Custo Total de Frete</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-[#F26522]">
            R$ {totalFreightSpent.toFixed(2)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Total faturado Lalamove</p>
        </div>
      </div>

      {/* Tabela de Auditoria e Histórico */}
      <div className="bg-[#171922] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-[#F26522]" />
            <h3 className="text-sm font-bold text-white">
              Log de Auditoria e Histórico de Corridas
            </h3>
          </div>

          <button
            type="button"
            disabled={orders.length === 0}
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="p-10 text-center text-xs text-gray-500">
            Nenhum pedido registrado até o momento. Use a busca acima para sincronizar pedidos da sua conta Lalamove por ID.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12141a] text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data/Hora</th>
                  <th className="px-4 py-3 font-semibold">ID do Pedido</th>
                  <th className="px-4 py-3 font-semibold">Modal</th>
                  <th className="px-4 py-3 font-semibold">Destinos</th>
                  <th className="px-4 py-3 font-semibold">Distância</th>
                  <th className="px-4 py-3 font-semibold">Motorista</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor Total</th>
                  <th className="px-4 py-3 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {orders.map((o) => (
                  <tr
                    key={o.orderId}
                    className="hover:bg-gray-800/40 transition-colors cursor-pointer group"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(o.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-orange-400 font-semibold">
                      {o.orderId.length > 18 ? `${o.orderId.slice(0, 18)}...` : o.orderId}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{o.serviceType}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {o.stops.length > 1 ? `${o.stops.length - 1} clientes` : '1 cliente'}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{o.distanceKm}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {o.driver ? `${o.driver.name} (${o.driver.plate})` : 'Nenhum'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : o.status === 'CANCELED'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                      R$ {o.priceBreakdown.total}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(o);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-[#F26522] border border-orange-500/30 text-[11px] font-semibold transition-colors flex items-center space-x-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes Completos do Envio */}
      <OrderDetailsModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={orders.find(o => o.orderId === selectedOrder?.orderId) || selectedOrder}
        onRefreshOrders={onRefreshOrders}
      />
    </div>
  );
}
