'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import {
  Timer,
  Zap,
  Clock,
  Percent,
  CheckCircle2,
  TrendingDown,
  Navigation,
  FileCheck2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { QuotationResponse, DeliveryTier, LalamoveServiceType } from '@/types/lalamove';
import { LALAMOVE_VEHICLES } from '@/lib/cubage';

interface QuotationCardProps {
  quotation: QuotationResponse | null;
  loading: boolean;
  selectedTier: DeliveryTier;
  setSelectedTier: (tier: DeliveryTier) => void;
  onRefreshQuotation: () => void;
  onConfirmOrder: () => void;
  onCompareRoutes: () => void;
  confirmingOrder: boolean;
}

export function QuotationCard({
  quotation,
  loading,
  selectedTier,
  setSelectedTier,
  onRefreshQuotation,
  onConfirmOrder,
  onCompareRoutes,
  confirmingOrder,
}: QuotationCardProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(300);

  useEffect(() => {
    if (!quotation?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(quotation.expiresAt).getTime();
      const diffSecs = Math.max(0, Math.floor((expiry - now) / 1000));
      setSecondsLeft(diffSecs);

    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [quotation]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-[#171922] border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#F26522] border-t-transparent rounded-full animate-spin" />
        <h4 className="text-sm font-semibold text-white">
          Consultando Cotação e Tarifas Oficiais...
        </h4>
        <p className="text-xs text-gray-400">
          Geocodificando paradas e calculando rota urbana em São Paulo
        </p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="bg-[#171922] border border-dashed border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-2">
        <Navigation className="w-8 h-8 text-gray-600 mb-1" />
        <h4 className="text-sm font-medium text-gray-300">Nenhuma cotação ativa</h4>
        <p className="text-xs text-gray-500 max-w-sm">
          Clique em "Cotar com API Lalamove v3" para obter a cotação oficial com preço congelado.
        </p>
      </div>
    );
  }

  const isExpired = secondsLeft <= 0;
  const vehicleSpec = LALAMOVE_VEHICLES[quotation.serviceType as LalamoveServiceType] || LALAMOVE_VEHICLES.LALAPRO;

  const currentDisplayPrice = quotation.priceBreakdown.total;

  return (
    <div className="bg-[#171922] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
      {/* Top Bar com Cronômetro */}
      <div
        className={`px-5 py-3 flex items-center justify-between border-b ${
          isExpired
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            : secondsLeft < 60
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Timer className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-semibold">
            {isExpired
              ? 'Preço Congelado Expirado'
              : 'Validade do Preço Garantido (5 minutos):'}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm font-mono font-bold">
            {isExpired ? '00:00' : formatTimer(secondsLeft)}
          </span>
          {isExpired && (
            <button
              onClick={onRefreshQuotation}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-2.5 py-1 rounded transition-colors"
            >
              Recotar
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Cabeçalho do Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-white">
                {vehicleSpec?.label || quotation.serviceType}
              </span>
              <span className="text-[10px] font-mono bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">
                {quotation.quotationId.slice(0, 16)}...
              </span>
              {quotation.isLiveApi ? (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  {quotation.apiEnv === 'production' ? 'Produção • API Oficial' : 'Sandbox • API de Testes'}
                </span>
              ) : (
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                  Cotação não verificada
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Distância total estimada: <strong className="text-white">{quotation.distance.text}</strong> ({quotation.stops.length} paradas no roteiro)
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-gray-400 block">Valor Selecionado</span>
            <span className="text-2xl font-extrabold text-[#F26522] tracking-tight">
              R$ {currentDisplayPrice}
            </span>
          </div>
        </div>

        {/* 3 TIERS OFICIAIS LALAMOVE (Prioridade, Regular, Agrupado) */}
        <div>
          <label className="text-xs font-bold text-gray-300 mb-2 flex items-center justify-between">
            <span>Modalidade de Atendimento Lalamove:</span>
            <span className="text-[11px] font-normal text-gray-500">
              Trocar modalidade solicita uma nova cotação
            </span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Prioridade */}
            <button
              type="button"
              onClick={() => setSelectedTier('PRIORITY')}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                selectedTier === 'PRIORITY'
                  ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                  : 'border-gray-800 bg-[#0F1117] hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Prioridade</span>
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Zap className="w-3 h-3 fill-current" />
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight line-clamp-2">
                Alocação rápida para entregas expressas
              </p>
              <div className="text-xs font-bold text-amber-400 mt-2 font-mono">
                {quotation.deliveryTier === 'PRIORITY' ? `R$ ${currentDisplayPrice}` : 'Consultar preço'}
              </div>
            </button>

            {/* Regular */}
            <button
              type="button"
              onClick={() => setSelectedTier('REGULAR')}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                selectedTier === 'REGULAR'
                  ? 'border-[#F26522] bg-[#F26522]/10 ring-1 ring-[#F26522]'
                  : 'border-gray-800 bg-[#0F1117] hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Regular</span>
                <Info className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight line-clamp-2">
                Entrega direta padrão ponto-a-ponto
              </p>
              <div className="text-xs font-bold text-[#F26522] mt-2 font-mono">
                {quotation.deliveryTier === 'REGULAR' ? `R$ ${currentDisplayPrice}` : 'Consultar preço'}
              </div>
            </button>

            {/* Agrupado */}
            <button
              type="button"
              onClick={() => setSelectedTier('POOLED')}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                selectedTier === 'POOLED'
                  ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                  : 'border-gray-800 bg-[#0F1117] hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Agrupado</span>
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Percent className="w-3 h-3" />
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight line-clamp-2">
                Espaço dividido e entrega sem urgência
              </p>
              <div className="text-xs font-bold text-emerald-400 mt-2 font-mono">
                {quotation.deliveryTier === 'POOLED' ? `R$ ${currentDisplayPrice}` : 'Consultar preço'}
              </div>
            </button>
          </div>
        </div>

        {/* Comparativo de Rota Otimizada se disponível */}
        {quotation.savingsVsManual && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-xs font-bold text-emerald-300 block">
                  Otimização de Rota Inteligente
                </span>
                <span className="text-[11px] text-emerald-200/80">
                  Economia de {quotation.savingsVsManual.kmSaved} km (R$ {quotation.savingsVsManual.priceSavedBrl.toFixed(2)})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCompareRoutes}
              className="text-xs font-semibold text-emerald-300 underline hover:text-emerald-200"
            >
              Ver Comparativo
            </button>
          </div>
        )}

        {/* Detalhamento de Custos */}
        <div className="bg-[#12141a] rounded-lg p-3.5 border border-gray-800 text-xs space-y-2">
          <div className="flex justify-between text-gray-400">
            <span>Tarifa Base do Modal:</span>
            <span className="text-gray-200 font-mono">R$ {quotation.priceBreakdown.base}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Quilometragem Adicional:</span>
            <span className="text-gray-200 font-mono">R$ {quotation.priceBreakdown.extraMileage || '—'}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Serviços Adicionais / Paradas Extras:</span>
            <span className="text-gray-200 font-mono">R$ {quotation.priceBreakdown.surcharge || '—'}</span>
          </div>
          <div className="pt-2 border-t border-gray-800 flex justify-between font-bold text-white text-sm">
            <span>Total da Corrida ({selectedTier === 'PRIORITY' ? 'Prioridade' : selectedTier === 'POOLED' ? 'Agrupado' : 'Regular'}):</span>
            <span className="text-[#F26522] font-mono">R$ {currentDisplayPrice}</span>
          </div>
        </div>

        {/* Botão de Contratação */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isExpired || confirmingOrder || !quotation.isLiveApi || selectedTier !== quotation.deliveryTier}
            onClick={onConfirmOrder}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all ${
              isExpired
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : confirmingOrder
                ? 'bg-[#D95314] text-white opacity-80 cursor-wait'
                : 'bg-[#F26522] hover:bg-[#D95314] text-white shadow-lg shadow-orange-500/25 active:scale-[0.99]'
            }`}
          >
            {confirmingOrder ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Confirmando e Alocando Motorista...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-5 h-5" />
                <span>Contratar Corrida Lalamove (R$ {currentDisplayPrice})</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
          <p className="text-[11px] text-gray-500 text-center mt-2">
            {quotation.apiEnv === 'production' ? 'Ao contratar, uma corrida real será solicitada à Lalamove pelo valor cotado.' : 'Esta cotação pertence ao ambiente de testes da Lalamove.'}
          </p>
        </div>
      </div>
    </div>
  );
}
