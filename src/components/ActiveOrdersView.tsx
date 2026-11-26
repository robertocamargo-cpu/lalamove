'use strict';
'use client';

import React, { useState } from 'react';
import {
  Truck,
  User,
  Phone,
  Share2,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Clock,
  MapPin,
  FileCheck,
  AlertOctagon,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { Order, StopDeliveryStatus } from '@/types/lalamove';
import { PodModal } from './PodModal';
import { OrderDetailsModal } from './OrderDetailsModal';

interface ActiveOrdersViewProps {
  orders: Order[];
  onRefreshOrders: () => void;
}

export function ActiveOrdersView({ orders, onRefreshOrders }: ActiveOrdersViewProps) {
  const [selectedPodStop, setSelectedPodStop] = useState<{
    stop: StopDeliveryStatus;
    orderId: string;
  } | null>(null);
  const [selectedFullOrder, setSelectedFullOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const activeOrders = orders.filter(o => o.isLiveApi && !['COMPLETED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(o.status));

  const handleChangeDriver = async (orderId: string) => {
    if (!confirm('Solicitar à Lalamove a troca do motorista atual por atraso?')) return;
    setActionError(null);
    setActionLoading(`driver_${orderId}`);
    try {
      const res = await fetch(`/api/lalamove/orders/${orderId}/change-driver`, {
        method: 'POST',
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Ação recusada pela Lalamove.'); }
      onRefreshOrders();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Deseja realmente cancelar esta corrida Lalamove?')) return;
    setActionError(null);
    setActionLoading(`cancel_${orderId}`);
    try {
      const res = await fetch(`/api/lalamove/orders/${orderId}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Ação recusada pela Lalamove.'); }
      onRefreshOrders();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleShareWhatsApp = (stop: StopDeliveryStatus, orderId: string) => {
    const text = encodeURIComponent(
      `Olá ${stop.clientName}! Sua entrega de guardanapos de papel da expedição já foi despachada via Lalamove. Acompanhe o motorista em tempo real pelo link: ${stop.shareLink}`
    );
    const cleanPhone = stop.clientPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${text}`, '_blank');
  };

  if (activeOrders.length === 0) {
    return (
      <div className="bg-[#171922] border border-dashed border-gray-800 rounded-xl p-12 text-center space-y-3">
        <Truck className="w-12 h-12 text-gray-600 mx-auto" />
        <h3 className="text-base font-semibold text-white">Nenhuma entrega em andamento</h3>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Faça uma cotação na aba "Nova Cotação" e contrate a corrida para acompanhar o rastreamento em tempo real aqui.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ASSIGNING_DRIVER':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            Alocando Motorista
          </span>
        );
      case 'ON_GOING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            A Caminho da Coleta
          </span>
        );
      case 'PICKED_UP':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Mercadoria Coletada / Em Rota
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Finalizada / 100% Entregue
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Atualização automática a cada 30 segundos</span>
        <button onClick={onRefreshOrders} className="text-orange-400 underline">Atualizar agora</button>
      </div>
      {actionError && <p role="alert" className="text-sm text-rose-300">{actionError}</p>}
      {activeOrders.map((order) => (
        <div
          key={order.orderId}
          className="bg-[#171922] border border-gray-800 rounded-2xl overflow-hidden shadow-xl"
        >
          {/* Header da Corrida */}
          <div className="p-5 border-b border-gray-800 bg-[#14161f] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#F26522] flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">
                    Pedido Lalamove #{order.orderId.slice(-8)}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Modal: <strong className="text-gray-200">{order.serviceType}</strong> • Distância: <strong className="text-gray-200">{order.distanceKm}</strong> • Valor Total: <strong className="text-[#F26522]">R$ {order.priceBreakdown.total}</strong>
                </p>
              </div>
            </div>

            {/* Ações Rápidas de Teste / Gestão */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFullOrder(order)}
                className="px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-[#F26522] border border-orange-500/30 text-xs font-semibold transition-colors flex items-center space-x-1"
              >
                <span>Ver Detalhes do Envio</span>
              </button>

              {order.driverId && ['ON_GOING'].includes(order.status) && (
                <button
                  type="button"
                  disabled={!!actionLoading}
                  onClick={() => handleChangeDriver(order.orderId)}
                  title="Trocar motorista em caso de atraso na coleta"
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors border border-gray-700 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Trocar Motorista</span>
                </button>
              )}

              {order.status !== 'COMPLETED' && (
                <button
                  type="button"
                  disabled={!!actionLoading}
                  onClick={() => handleCancelOrder(order.orderId)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors border border-rose-500/20"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {order.syncWarning && <p role="alert" className="px-5 py-3 text-xs text-amber-300">{order.syncWarning}{order.lastSyncedAt ? ` Última consulta: ${new Date(order.lastSyncedAt).toLocaleString('pt-BR')}` : ''}</p>}
          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1 & 2: Timeline das Paradas e Links de Rastreamento */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Roteiro de Entregas & Links para Destinatários
              </h4>

              <div className="space-y-3">
                {order.stops.map((stop, idx) => {
                  const isDelivered = stop.status === 'DELIVERED';
                  const isInTransit = stop.status === 'IN_TRANSIT';
                  const isOrigin = idx === 0;

                  return (
                    <div
                      key={stop.stopId || idx}
                      className={`p-4 rounded-xl border transition-all ${
                        isDelivered
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : isInTransit
                          ? 'bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/20'
                          : 'bg-[#12141a] border-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isDelivered
                                ? 'bg-emerald-500 text-black'
                                : isInTransit
                                ? 'bg-blue-500 text-white animate-pulse'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {isDelivered ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isOrigin ? (
                              'Orig'
                            ) : (
                              idx
                            )}
                          </div>

                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-white">
                                {stop.clientName}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  isDelivered
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : isInTransit
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : 'bg-gray-800 text-gray-400'
                                }`}
                              >
                                {isDelivered
                                  ? 'Entregue'
                                  : isInTransit
                                  ? 'Motorista a Caminho'
                                  : 'Aguardando'}
                              </span>
                            </div>

                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              {stop.address}
                            </p>

                            <p className="text-xs text-gray-500 mt-0.5">
                              Contato: <strong className="text-gray-300">{stop.clientPhone}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Botões de Rastreio / POD / WhatsApp */}
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                          {!isOrigin && stop.shareLink && stop.clientPhone && (
                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(stop, order.orderId)}
                              title="Enviar link de rastreamento para o cliente no WhatsApp"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center space-x-1 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}

                          {stop.pod ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPodStop({ stop, orderId: order.orderId })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-[#F26522]/20 hover:bg-[#F26522]/30 text-orange-300 border border-[#F26522]/30 text-xs font-medium flex items-center space-x-1 transition-colors"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>Ver POD</span>
                            </button>
                          ) : stop.shareLink ? (
                            <a
                              href={stop.shareLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium flex items-center space-x-1 transition-colors"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Link Rastreio</span>
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna 3: Cartão do Motorista Lalamove */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Motorista Parceiro Alocado
              </h4>

              {order.driver ? (
                <div className="bg-[#12141a] border border-gray-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center space-x-3">
                    {order.driver.photoUrl ? <img
                      src={order.driver.photoUrl}
                      alt={order.driver.name}
                      className="w-12 h-12 rounded-full object-cover border border-orange-500/40"
                    /> : <User className="w-12 h-12 text-gray-500" />}
                    <div>
                      <h5 className="text-sm font-bold text-white">
                        {order.driver.name}
                      </h5>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Dados recebidos da Lalamove
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-2 border-t border-gray-800/80 pt-3 text-gray-400">
                    <div className="flex justify-between">
                      <span>Veículo:</span>
                      <span className="text-gray-200 font-medium">
                        {order.driver.vehicleModel || 'Não informado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Placa:</span>
                      <span className="text-white font-mono font-bold bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
                        {order.driver.plate || 'Não informada'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Telefone Direto:</span>
                      <a
                        href={`tel:${order.driver.phone}`}
                        className="text-[#F26522] hover:underline flex items-center gap-1 font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        {order.driver.phone}
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#12141a] border border-gray-800 rounded-xl p-6 text-center text-xs text-gray-400">
                  <Clock className="w-6 h-6 text-orange-400 mx-auto mb-2 animate-spin" />
                  {order.driverId ? 'Motorista atribuído. Dados ainda indisponíveis pela API.' : 'Aguardando atribuição de motorista pela Lalamove.'}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Modal do Comprovante Digital (POD) */}
      <PodModal
        isOpen={!!selectedPodStop}
        onClose={() => setSelectedPodStop(null)}
        stop={selectedPodStop?.stop || null}
        orderId={selectedPodStop?.orderId || ''}
      />

      {/* Modal de Detalhes Completos do Envio */}
      <OrderDetailsModal
        isOpen={!!selectedFullOrder}
        onClose={() => setSelectedFullOrder(null)}
        order={orders.find(o => o.orderId === selectedFullOrder?.orderId) || selectedFullOrder}
        onRefreshOrders={onRefreshOrders}
      />
    </div>
  );
}

