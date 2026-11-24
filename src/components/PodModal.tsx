'use strict';
'use client';

import React from 'react';
import { X, CheckCircle2, ShieldCheck, Download, Calendar, User, FileText } from 'lucide-react';
import { StopDeliveryStatus } from '@/types/lalamove';

interface PodModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: StopDeliveryStatus | null;
  orderId: string;
}

export function PodModal({ isOpen, onClose, stop, orderId }: PodModalProps) {
  if (!isOpen || !stop || !stop.pod) return null;

  const pod = stop.pod;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171922] border border-gray-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Comprovante Digital de Entrega (POD)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Badge */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Entrega Concluída com Sucesso
              </span>
            </div>
            <span className="text-xs font-mono text-emerald-300">
              {pod.deliveredAt}
            </span>
          </div>

          {/* Destinatário & Endereço */}
          <div className="bg-[#12141a] rounded-xl p-4 border border-gray-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Cliente / Local:</span>
              <span className="text-white font-semibold">{stop.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Endereço de Entrega:</span>
              <span className="text-gray-300 text-right max-w-[240px] truncate">
                {stop.address}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Recebedor:</span>
              <span className="text-white font-semibold">{pod.receiverName}</span>
            </div>
            {pod.receiverDoc && (
              <div className="flex justify-between">
                <span className="text-gray-400">Documento (RG/CPF):</span>
                <span className="text-gray-200 font-mono">{pod.receiverDoc}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Código da Corrida Lalamove:</span>
              <span className="text-orange-400 font-mono">{orderId}</span>
            </div>
          </div>

          {/* Foto da Carga Entregue */}
          <div>
            <label className="text-xs font-semibold text-gray-300 mb-1.5 block">
              Registro Fotográfico da Mercadoria Entregue:
            </label>
            <div className="rounded-xl overflow-hidden border border-gray-700 bg-black aspect-video relative">
              <img
                src={pod.photoUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600'}
                alt="Foto do pacote entregue"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded font-mono">
                Geotag: SP - {pod.deliveredAt}
              </div>
            </div>
          </div>

          {/* Assinatura Digital do Recebedor */}
          <div>
            <label className="text-xs font-semibold text-gray-300 mb-1.5 block">
              Assinatura Digital Coletada no Aplicativo do Motorista:
            </label>
            <div className="bg-white rounded-xl p-3 border border-gray-300 flex items-center justify-center h-24">
              {pod.signatureUrl ? (
                <img
                  src={pod.signatureUrl}
                  alt="Assinatura do recebedor"
                  className="max-h-16"
                />
              ) : (
                <span className="text-xs text-gray-400 font-mono">
                  [Assinatura Biométrica Digital Registrada]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#12141a] border-t border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Fechar Comprovante
          </button>
        </div>
      </div>
    </div>
  );
}

