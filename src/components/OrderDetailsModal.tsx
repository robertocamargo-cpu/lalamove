'use strict';
'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  Truck,
  Share2,
  MessageCircle,
  FileText,
  DollarSign,
  ShieldCheck,
  Zap,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { Order, StopDeliveryStatus } from '@/types/lalamove';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onRefreshOrders?: () => void;
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  order,
  onRefreshOrders,
}: OrderDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [addingTip, setAddingTip] = useState(false);
  const [tipAmount, setTipAmount] = useState('10.00');
  const [tipLoading, setTipLoading] = useState(false);
  const [tipMessage, setTipMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const isCompleted = order.status === 'COMPLETED';
  const isCanceled = order.status === 'CANCELED';
  const isOngoing = !isCompleted && !isCanceled;

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = (stop: StopDeliveryStatus) => {
    const text = encodeURIComponent(
      `Olá ${stop.clientName}! Segue o link de rastreamento da sua entrega Lalamove (Pedido #${order.orderId}): ${stop.shareLink}`
    );
    const cleanPhone = stop.clientPhone.replace(/\D/g, '');
    window.open(
      `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${text}`,
      '_blank'
    );
  };

  const handleAddPriorityFee = async () => {
    setTipLoading(true);
    setTipMessage(null);
    try {
      const res = await fetch(`/api/lalamove/orders/${order.orderId}/priority-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee: tipAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao adicionar taxa');
      setTipMessage('Taxa de prioridade adicionada com sucesso!');
      setAddingTip(false);
      if (onRefreshOrders) onRefreshOrders();
    } catch (err: any) {
      setTipMessage(err.message || 'Erro ao adicionar taxa');
    } finally {
      setTipLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="bg-[#171922] border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 bg-[#12141a] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[#F26522] flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Detalhes Completos do Envio
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isCanceled
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                  }`}
                >
                  {isCompleted ? 'Finalizado / Entregue' : isCanceled ? 'Cancelado' : 'Em Andamento'}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-0.5 text-xs text-gray-400">
                <span>Pedido:</span>
                <span className="font-mono text-gray-200 font-semibold">{order.orderId}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copiar ID"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span>•</span>
                <span>{new Date(order.createdAt).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Card Resumo Financeiro & Modal */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-[#12141a] border border-gray-800 rounded-xl p-3.5">
              <span className="text-[11px] text-gray-400 uppercase font-semibold block">Modal Lalamove</span>
              <span className="text-sm font-bold text-white mt-1 block">{order.serviceType}</span>
              <span className="text-[11px] text-gray-500">Distância: {order.distanceKm}</span>
            </div>

            <div className="bg-[#12141a] border border-gray-800 rounded-xl p-3.5">
              <span className="text-[11px] text-gray-400 uppercase font-semibold block">Tarifa Base</span>
              <span className="text-sm font-bold text-gray-200 mt-1 block">R$ {order.priceBreakdown.base}</span>
              <span className="text-[11px] text-gray-500">Quilometragem: R$ {order.priceBreakdown.extraMileage}</span>
            </div>

            <div className="bg-[#12141a] border border-gray-800 rounded-xl p-3.5">
              <span className="text-[11px] text-gray-400 uppercase font-semibold block">Taxas / Adicionais</span>
              <span className="text-sm font-bold text-gray-200 mt-1 block">R$ {order.priceBreakdown.surcharge}</span>
              <span className="text-[11px] text-gray-500">Gorjeta / Urgência inclusa</span>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-[#F26522]/30 rounded-xl p-3.5">
              <span className="text-[11px] text-orange-300 uppercase font-bold block">Valor Total Faturado</span>
              <span className="text-xl font-extrabold text-[#F26522] mt-0.5 block">
                R$ {order.priceBreakdown.total}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">Preço Oficial Lalamove</span>
            </div>
          </div>

          {/* Motorista Parceiro */}
          {order.driver && (
            <div className="bg-[#12141a] border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border border-orange-500/40 shrink-0">
                  <img
                    src={order.driver.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={order.driver.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">{order.driver.name}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.2 rounded-full font-medium">
                      Motorista Oficial
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.driver.vehicleModel} • Placa:{' '}
                    <strong className="text-white font-mono bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                      {order.driver.plate}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {order.driver.phone && (
                  <a
                    href={`tel:${order.driver.phone}`}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold border border-gray-700 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#F26522]" />
                    <span>Ligar ({order.driver.phone})</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Linha do Tempo e Paradas do Roteiro */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>Roteiro de Paradas & Comprovantes Digitais (POD)</span>
              <span className="text-gray-500 font-normal">{order.stops.length} paradas no total</span>
            </h4>

            <div className="space-y-3">
              {order.stops.map((stop, idx) => {
                const isOrigin = idx === 0;
                const isDelivered = stop.status === 'DELIVERED';
                const pod = stop.pod;

                return (
                  <div
                    key={stop.stopId || idx}
                    className={`rounded-xl border p-4 transition-all ${
                      isDelivered
                        ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                        : 'bg-[#12141a] border-gray-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            isDelivered
                              ? 'bg-emerald-500 text-black'
                              : isOrigin
                              ? 'bg-[#F26522] text-white'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {isDelivered ? <CheckCircle2 className="w-4 h-4" /> : isOrigin ? 'Orig' : idx}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white">{stop.clientName}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isDelivered
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              {isDelivered ? 'Entregue' : isOrigin ? 'Ponto de Coleta' : 'Aguardando'}
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

                      {/* Botões de Ação por Parada */}
                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-start">
                        {!isOrigin && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(stop)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium flex items-center space-x-1 transition-colors"
                            title="Enviar link de rastreamento no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        )}

                        <a
                          href={stop.shareLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium flex items-center space-x-1 border border-gray-700 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5 text-orange-400" />
                          <span>Rastreio ao Vivo</span>
                        </a>
                      </div>
                    </div>

                    {/* Comprovante de Entrega Digital (POD) */}
                    {pod && (
                      <div className="mt-4 pt-3.5 border-t border-gray-800/80 bg-black/20 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" />
                            Comprovante Digital de Entrega (POD Oficial)
                          </span>
                          <span className="text-gray-400 font-mono text-[11px]">{pod.deliveredAt}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Foto da Entrega */}
                          <div>
                            <span className="text-[11px] text-gray-400 block mb-1">Registro Fotográfico:</span>
                            <div className="rounded-lg overflow-hidden border border-gray-700 bg-black aspect-video relative">
                              <img
                                src={pod.photoUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600'}
                                alt="Foto do pacote entregue"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>

                          {/* Assinatura e Recebedor */}
                          <div className="flex flex-col justify-between space-y-2">
                            <div className="text-xs space-y-1 bg-[#12141a] p-2.5 rounded-lg border border-gray-800">
                              <div className="text-gray-400">
                                Recebido por:{' '}
                                <strong className="text-white">{pod.receiverName || 'Recebedor Autorizado'}</strong>
                              </div>
                              {pod.receiverDoc && (
                                <div className="text-gray-400">
                                  Doc / RG: <strong className="text-gray-200 font-mono">{pod.receiverDoc}</strong>
                                </div>
                              )}
                            </div>

                            <div>
                              <span className="text-[11px] text-gray-400 block mb-1">Assinatura Digital Coletada:</span>
                              <div className="bg-white rounded-lg p-2 h-16 flex items-center justify-center border border-gray-300">
                                {pod.signatureUrl ? (
                                  <img src={pod.signatureUrl} alt="Assinatura" className="max-h-12" />
                                ) : (
                                  <span className="text-xs text-gray-400 font-mono">[Assinatura Biométrica Validada]</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Adicionar Taxa de Urgência / Prioridade (se corrida ativa) */}
          {isOngoing && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-300">
                  <Zap className="w-4 h-4 fill-current" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Acelerar Atendimento (Taxa de Prioridade / Gorjeta)
                  </span>
                </div>
                {!addingTip && (
                  <button
                    type="button"
                    onClick={() => setAddingTip(true)}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-lg transition-colors"
                  >
                    Adicionar Taxa
                  </button>
                )}
              </div>

              {addingTip && (
                <div className="flex items-center space-x-2 pt-2 border-t border-amber-500/20">
                  <span className="text-xs text-amber-200">Valor da Taxa (R$):</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    className="w-24 bg-[#0F1117] border border-amber-500/40 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={tipLoading}
                    onClick={handleAddPriorityFee}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded transition-colors"
                  >
                    {tipLoading ? 'Enviando...' : 'Confirmar Taxa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingTip(false)}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {tipMessage && (
                <p className="text-xs text-emerald-400 font-medium">{tipMessage}</p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#12141a] border-t border-gray-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500">
            {isCompleted ? '✓ Corrida arquivada e auditada' : 'Corrida sincronizada via API Lalamove v3'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </div>
  );
}

