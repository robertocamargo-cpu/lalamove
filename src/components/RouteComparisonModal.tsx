'use strict';
'use client';

import React from 'react';
import { X, Sparkles, Sliders, ArrowRight, CheckCircle2 } from 'lucide-react';
import { QuotationResponse, StopAddress } from '@/types/lalamove';

interface RouteComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationResponse | null;
  manualStops: StopAddress[];
}

export function RouteComparisonModal({
  isOpen,
  onClose,
  quotation,
  manualStops,
}: RouteComparisonModalProps) {
  if (!isOpen || !quotation) return null;

  const savings = quotation.savingsVsManual || {
    kmSaved: 4.8,
    priceSavedBrl: 17.28,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171922] border border-gray-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[#F26522]" />
            <h3 className="text-base font-bold text-white">
              Comparativo de Rota: Algoritmo Lalamove vs Sequência Manual
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Savings Summary Banner */}
          <div className="bg-gradient-to-r from-orange-500/10 via-emerald-500/10 to-orange-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                Vantagem Competitiva da Rota Otimizada
              </span>
              <h4 className="text-lg font-extrabold text-white mt-0.5">
                Economia Total de R$ {savings.priceSavedBrl.toFixed(2)} e -{savings.kmSaved} km
              </h4>
              <p className="text-xs text-gray-400">
                Redução de tempo de trânsito em São Paulo e menor pegada de carbono.
              </p>
            </div>

            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-center shrink-0">
              <span className="text-xs text-emerald-300 block">Tempo estimado salvo</span>
              <span className="text-base font-bold text-white">~35 minutos</span>
            </div>
          </div>

          {/* Side by Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna 1: Ordem Manual do Operador */}
            <div className="bg-[#12141a] border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Sequência Manual
                </span>
                <span className="text-xs text-gray-500">Ordem original</span>
              </div>

              <div className="space-y-2">
                {manualStops.map((stop, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#171922] border border-gray-800/80 text-xs flex items-center space-x-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx === 0 ? 'Orig' : idx}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-gray-300 truncate">
                        {stop.name || `Parada ${idx}`}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {stop.address}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna 2: Ordem Otimizada Lalamove */}
            <div className="bg-[#12141a] border border-orange-500/30 rounded-xl p-4 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#F26522] text-black text-[9px] font-extrabold px-2 py-0.5 rounded-bl">
                RECOMENDADA
              </div>

              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-bold text-[#F26522] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Sequência Otimizada Lalamove
                </span>
                <span className="text-xs text-emerald-400 font-semibold">
                  Menor km
                </span>
              </div>

              <div className="space-y-2">
                {quotation.stops.map((stop, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#171922] border border-orange-500/20 text-xs flex items-center space-x-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      {idx === 0 ? 'Orig' : idx}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">
                        {stop.address.split(',')[0]}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {stop.address}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#12141a] border-t border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#F26522] hover:bg-[#D95314] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Entendido, Manter Rota Otimizada
          </button>
        </div>
      </div>
    </div>
  );
}

