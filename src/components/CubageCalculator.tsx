'use strict';
'use client';

import React from 'react';
import {
  Boxes,
  Weight,
  Maximize2,
  ShieldAlert,
  Clock,
  UserCheck,
  Check,
  Info,
  RotateCcw,
} from 'lucide-react';
import { LalamoveServiceType, SpecialRequest } from '@/types/lalamove';
import { CargoVolume, calculateMultiCubage } from '@/lib/cubage-multi';
import {
  calculateCubage,
  LALAMOVE_VEHICLES,
} from '@/lib/cubage';

interface CubageCalculatorProps {
  quantityBoxes: number;
  setQuantityBoxes: (val: number) => void;
  weightPerBoxKg: number;
  setWeightPerBoxKg: (val: number) => void;
  lengthCm: number;
  setLengthCm: (val: number) => void;
  widthCm: number;
  setWidthCm: (val: number) => void;
  heightCm: number;
  setHeightCm: (val: number) => void;
  selectedService: LalamoveServiceType;
  setSelectedService: (val: LalamoveServiceType) => void;
  specialRequests: SpecialRequest[];
  setSpecialRequests: React.Dispatch<React.SetStateAction<SpecialRequest[]>>;
  scheduleAt: string;
  setScheduleAt: (val: string) => void;
  additionalVolumes: CargoVolume[];
  setAdditionalVolumes: React.Dispatch<React.SetStateAction<CargoVolume[]>>;
}

export function CubageCalculator({
  quantityBoxes,
  setQuantityBoxes,
  weightPerBoxKg,
  setWeightPerBoxKg,
  lengthCm,
  setLengthCm,
  widthCm,
  setWidthCm,
  heightCm,
  setHeightCm,
  selectedService,
  setSelectedService,
  specialRequests,
  setSpecialRequests,
  scheduleAt,
  setScheduleAt,
  additionalVolumes,
  setAdditionalVolumes,
}: CubageCalculatorProps) {
  const allVolumes: CargoVolume[] = [{ id: 'volume_primary', quantityBoxes, weightPerBoxKg, lengthCm, widthCm, heightCm }, ...additionalVolumes];
  const cubage = calculateMultiCubage(allVolumes);

  const toggleSpecialRequest = (req: SpecialRequest) => {
    if (specialRequests.includes(req)) {
      setSpecialRequests(specialRequests.filter((r) => r !== req));
    } else {
      setSpecialRequests([...specialRequests, req]);
    }
  };

  const availableModals: LalamoveServiceType[] = [
    'LALAPRO',
    'LALAGO',
    'HATCHBACK',
    'CAR',
    'LUV',
    'VAN',
    'TRUCK',
  ];

  return (
    <div className="bg-[#171922] border border-gray-800 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-orange-500/10 text-[#F26522]">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Carga & Calculadora de Cubagem (Guardanapos de Papel)
            </h3>
            <p className="text-xs text-gray-400">
              Categoria Lalamove: OFFICE_SUPPLIES / Manter Seco (KEEP_DRY)
            </p>
          </div>
        </div>

        {/* Badge de recomendação automática */}
        <div className="text-right">
          <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block">
            Modal Sugerido
          </span>
          <span className="text-xs font-bold text-[#F26522] bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
            {cubage.vehicleLabel}
          </span>
        </div>
      </div>

      {/* Inputs de Volume e Dimensões */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5 text-gray-400" />
            Qtd. Caixas
          </label>
          <input
            type="number"
            min={1}
            value={quantityBoxes}
            onChange={(e) => setQuantityBoxes(parseInt(e.target.value) || 1)}
            className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F26522]"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
            <Weight className="w-3.5 h-3.5 text-gray-400" />
            Peso/Cx (kg)
          </label>
          <input
            type="number"
            step="0.5"
            min={0.1}
            value={weightPerBoxKg}
            onChange={(e) => setWeightPerBoxKg(parseFloat(e.target.value) || 0.1)}
            className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F26522]"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
            Compr. (cm)
          </label>
          <input
            type="number"
            min={1}
            value={lengthCm}
            onChange={(e) => setLengthCm(parseInt(e.target.value) || 1)}
            className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F26522]"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
            Largura (cm)
          </label>
          <input
            type="number"
            min={1}
            value={widthCm}
            onChange={(e) => setWidthCm(parseInt(e.target.value) || 1)}
            className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F26522]"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-300 flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
            Altura (cm)
          </label>
          <input
            type="number"
            min={1}
            value={heightCm}
            onChange={(e) => setHeightCm(parseInt(e.target.value) || 1)}
            className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F26522]"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-dashed border-gray-700 bg-[#12141a] p-3">
        <div className="flex items-center justify-between gap-3">
          <div><h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Volumes adicionais</h4><p className="text-[11px] text-gray-500">Cadastre caixas com tamanhos ou pesos diferentes.</p></div>
          <button type="button" onClick={() => setAdditionalVolumes([...additionalVolumes, { id: `volume_${Date.now()}`, quantityBoxes: 1, weightPerBoxKg: 1, lengthCm: 20, widthCm: 20, heightCm: 20 }])} className="rounded-lg bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-orange-300 hover:bg-orange-500/25">+ Adicionar volume</button>
        </div>
        {additionalVolumes.map((volume, index) => {
          const update = (field: keyof CargoVolume, value: number) => setAdditionalVolumes(additionalVolumes.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
          return <div key={volume.id} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-800 bg-[#0F1117] p-3 sm:grid-cols-6">
            {([['quantityBoxes', 'Qtd.'], ['weightPerBoxKg', 'kg/caixa'], ['lengthCm', 'Compr. cm'], ['widthCm', 'Largura cm'], ['heightCm', 'Altura cm']] as const).map(([field, label]) => <label key={field} className="text-[10px] text-gray-400">{label}<input type="number" min={0.1} step={field === 'quantityBoxes' ? 1 : 0.1} value={volume[field]} onChange={(event) => update(field, Number(event.target.value) || 0.1)} className="mt-1 w-full rounded-md border border-gray-700 bg-[#171922] px-2 py-1.5 text-xs text-white" /></label>)}
            <button type="button" onClick={() => setAdditionalVolumes(additionalVolumes.filter((_, itemIndex) => itemIndex !== index))} className="self-end rounded-md border border-rose-500/30 px-2 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10">Remover</button>
          </div>;
        })}
      </div>
      {/* Resumo da Cubagem */}
      <div className="bg-[#12141a] rounded-lg p-3.5 border border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div>
          <span className="text-[11px] text-gray-400 block">Peso Bruto Total</span>
          <span className="text-sm font-bold text-white">{cubage.totalWeightKg} kg</span>
        </div>
        <div>
          <span className="text-[11px] text-gray-400 block">Volume Total (m³)</span>
          <span className="text-sm font-bold text-orange-400">{cubage.totalVolumeM3} m³</span>
        </div>
        <div>
          <span className="text-[11px] text-gray-400 block">Peso Cubado Aferido</span>
          <span className="text-sm font-bold text-white">{cubage.cubedWeightKg} kg</span>
        </div>
        <div>
          <span className="text-[11px] text-gray-400 block">Capacidade Modal</span>
          <span className="text-sm font-bold text-emerald-400">{cubage.vehicleCapacity}</span>
        </div>
      </div>

      {/* Alerta de Acondicionamento */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3.5 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300 font-semibold block mb-0.5">
            Proteção de Guardanapos e Papéis
          </strong>
          Cargas de papel requerem baú estanque (ex: categoria <code className="text-white font-mono">LalaPro</code> ou <code className="text-white font-mono">Utilitário Baú</code>) para evitar umidade.
        </div>
      </div>

      {/* Seleção do Modal Lalamove (Exatamente como no portal oficial) */}
      <div>
        <label className="text-xs font-semibold text-gray-300 mb-2 block">
          Categorias Oficiais Lalamove Brasil:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {availableModals.map((serviceKey) => {
            const spec = LALAMOVE_VEHICLES[serviceKey];
            const isSelected = selectedService === serviceKey;
            const isRecommended = cubage.recommendedService === serviceKey;

            return (
              <button
                key={serviceKey}
                type="button"
                onClick={() => setSelectedService(serviceKey)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-[#F26522] bg-[#F26522]/10 ring-1 ring-[#F26522]'
                    : 'border-gray-800 bg-[#0F1117] hover:border-gray-700'
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-2 right-2 text-[9px] bg-emerald-500 text-black font-bold px-1.5 py-0.2 rounded shadow">
                    IDEAL
                  </span>
                )}
                <div className="text-xs font-bold text-white">{spec.categoryName}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                  {spec.dimensionsText} â€¢ {spec.maxWeightKg} kg
                </div>
                <div className="text-[11px] font-semibold text-orange-400 mt-2">
                  Base R$ {spec.baseRateBrl.toFixed(2)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Serviços Adicionais & Agendamento */}
      <div className="pt-2 border-t border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => toggleSpecialRequest('HELP_LOADING_UNLOADING')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              specialRequests.includes('HELP_LOADING_UNLOADING')
                ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                : 'border-gray-800 bg-[#0F1117] text-gray-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Ajudante de Carga (+ R$ 45)</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSpecialRequest('RETURN_TRIP')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              specialRequests.includes('RETURN_TRIP')
                ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                : 'border-gray-800 bg-[#0F1117] text-gray-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Corrida de Retorno</span>
          </button>
        </div>

        {/* Agendamento */}
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-300">Agendar:</span>
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            className="bg-[#0F1117] border border-gray-700 text-xs text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#F26522]"
          />
        </div>
      </div>
    </div>
  );
}



