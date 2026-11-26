'use strict';
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Sparkles,
  Sliders,
  Phone,
  Building,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { StopAddress } from '@/types/lalamove';
import { AddressFields } from './AddressFields';
import { formatCep, applyCepAddress, formatStopAddress } from '@/lib/stop-address';

interface StopFormProps {
  stops: StopAddress[];
  setStops: React.Dispatch<React.SetStateAction<StopAddress[]>>;
  isRouteOptimized: boolean;
  setIsRouteOptimized: (val: boolean) => void;
  onCepLookupStateChange?: (loading: boolean) => void;
}

export function StopForm({
  stops,
  setStops,
  isRouteOptimized,
  setIsRouteOptimized,
  onCepLookupStateChange,
}: StopFormProps) {
  const [loadingCepIds, setLoadingCepIds] = useState<Record<string, boolean>>({});
  const [cepErrors, setCepErrors] = useState<Record<string, string>>({});
  const cepRequests = useRef<Record<string, number>>({});
  const [showEditOrigin, setShowEditOrigin] = useState(false);
  useEffect(() => {
    onCepLookupStateChange?.(stops.some(stop => loadingCepIds[stop.id]));
  }, [loadingCepIds, stops, onCepLookupStateChange]);

  // A consulta deve atualizar o estado mais recente, sem restaurar o CEP de sete dígitos.
  const handleCepChange = async (index: number, value: string) => {
    const stopId = stops[index].id;
    const cep = formatCep(value);
    const cleanCep = cep.replace(/\D/g, '');
    const requestId = (cepRequests.current[stopId] || 0) + 1;
    cepRequests.current[stopId] = requestId;
    setStops(prev => prev.map(stop => stop.id === stopId
      ? { ...stop, cep, coordinates: { lat: '', lng: '' } } : stop));
    setCepErrors(prev => ({ ...prev, [stopId]: '' }));
    setLoadingCepIds(prev => ({ ...prev, [stopId]: cleanCep.length === 8 }));
    if (cleanCep.length !== 8) return;

    try {
      const res = await fetch(`/api/cep/${cleanCep}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível consultar o CEP.');
      if (cepRequests.current[stopId] !== requestId) return;
      setStops(prev => applyCepAddress(prev, stopId, cleanCep, data));
    } catch (err: any) {
      if (cepRequests.current[stopId] === requestId) {
        setCepErrors(prev => ({ ...prev, [stopId]: err.message || 'Erro ao consultar CEP.' }));
      }
    } finally {
      if (cepRequests.current[stopId] === requestId) {
        setLoadingCepIds(prev => ({ ...prev, [stopId]: false }));
      }
    }
  };

  const handleUpdateStop = (index: number, field: keyof StopAddress, value: any) => {
    const stopId = stops[index].id;
    if (['address', 'street', 'neighborhood', 'city', 'state'].includes(field)) {
      // Um endereço corrigido manualmente não pode ser substituído por uma resposta atrasada.
      cepRequests.current[stopId] = (cepRequests.current[stopId] || 0) + 1;
      setLoadingCepIds(prev => ({ ...prev, [stopId]: false }));
    }
    setStops(prev => prev.map(stop => {
      if (stop.id !== stopId) return stop;
      const updated = { ...stop, [field]: value };
      if (['street', 'number', 'complement', 'neighborhood', 'city', 'state'].includes(field)) updated.address = formatStopAddress(updated);
      if (['address', 'cep', 'number', 'street', 'city', 'state'].includes(field)) {
        updated.coordinates = { lat: '', lng: '' };
      }
      return updated;
    }));
  };

  const handleAddStop = () => {
    const newStop: StopAddress = {
      id: `stop_${Date.now()}`,
      name: '',
      phone: '',
      address: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      cep: '',
      coordinates: { lat: '', lng: '' },
      remarks: '',
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (index: number) => {
    if (stops.length <= 2) return; // Deve manter ao menos origem e 1 entrega
    const updated = stops.filter((_, i) => i !== index);
    setStops(updated);
  };

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index <= 1) return; // Não troca com a origem (index 0)
    if (direction === 'down' && index >= stops.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...stops];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setStops(updated);
  };

  // Inverte a rota: a matriz (CEP 01514-001, nº 557) e o endereço digitado trocam de papel.
  // - Normal: [Matriz, Cliente A, Cliente B] -> [Cliente A, Cliente B, Matriz]
  // - Invertida: [Cliente A, Cliente B, Matriz] -> [Matriz, Cliente A, Cliente B]
  const handleSwapRoute = () => {
    setStops((prev) => {
      const warehouseIdx = prev.findIndex((s) => s.isWarehouse);
      let reordered: StopAddress[];

      if (warehouseIdx >= 0) {
        const warehouse = prev[warehouseIdx];
        const others = prev.filter((_, i) => i !== warehouseIdx);
        reordered =
          warehouseIdx === 0 ? [...others, warehouse] : [warehouse, ...others];
      } else if (prev.length >= 2) {
        // Sem a matriz na rota: apenas troca origem com o primeiro destino.
        reordered = [...prev];
        [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
      } else {
        return prev;
      }

      return reordered.map((stop, i) => ({ ...stop, isOrigin: i === 0 }));
    });
  };

  const originStop = stops[0];
  const deliveryStops = stops.slice(1);
  const originIsWarehouse = Boolean(originStop?.isWarehouse);
  const firstDestination = stops[1];
  const canSwapRoute =
    stops.length >= 2 &&
    (originIsWarehouse
      ? Boolean(firstDestination?.address?.trim() || firstDestination?.cep?.replace(/\D/g, ''))
      : true);

  return (
    <div className="space-y-6">
      {/* Origem (matriz fixa ou endereço digitado, conforme inversão) */}
      <div className="bg-[#171922] border border-gray-800 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#F26522]" />

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#F26522]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#F26522]">
                  {originIsWarehouse
                    ? 'Ponto de Coleta Padrão (Origem)'
                    : 'Ponto de Coleta (Origem)'}
                </span>
                {originIsWarehouse ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                    Coordenadas em Cache
                  </span>
                ) : (
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-medium">
                    Endereço Digitado
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-white mt-0.5">
                {originStop?.name ||
                  (originIsWarehouse
                    ? 'Nevine Liberdade (Vinicius)'
                    : 'Endereço digitado')}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {originStop?.address ||
                  'Rua do Glicério, 557 — Liberdade, São Paulo - SP'}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-[11px] text-gray-500">
                <span>CEP {originStop?.cep || '—'}</span>
                <span>Nº {originStop?.number || '—'}</span>
                <span>Tel. {originStop?.phone || '—'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleSwapRoute}
              disabled={!canSwapRoute}
              title={
                canSwapRoute
                  ? 'Inverter: a matriz (CEP 01514-001, nº 557) vira destino e o endereço digitado vira origem.'
                  : 'Preencha o destino para inverter a rota.'
              }
              className="flex items-center space-x-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D95314] to-[#F26522] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Inverter Origem/Destino</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEditOrigin(!showEditOrigin)}
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-800 transition-colors border border-gray-700/60"
            >
              {showEditOrigin ? 'Ocultar Edição' : 'Alterar Origem'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
          {originIsWarehouse
            ? 'Origem fixa na matriz: CEP 01514-001, nº 557. Clique em "Inverter Origem/Destino" para que o endereço digitado seja a coleta e a matriz (01514-001, nº 557) seja a entrega.'
            : 'Rota invertida: o endereço digitado é a coleta e a matriz (CEP 01514-001, nº 557) é a entrega. Clique novamente para voltar ao padrão.'}
        </p>

        {showEditOrigin && (
          <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium">Nome / Unidade</label>
              <input
                type="text"
                value={originStop.name}
                onChange={(e) => handleUpdateStop(0, 'name', e.target.value)}
                className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F26522]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium">Telefone Coleta</label>
              <input
                type="text"
                value={originStop.phone}
                onChange={(e) => handleUpdateStop(0, 'phone', e.target.value)}
                className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F26522]"
              />
            </div>
            <div className="md:col-span-3">
              <AddressFields stop={originStop} label="da origem" loading={loadingCepIds[originStop.id]}
                error={cepErrors[originStop.id]} onCepChange={value => handleCepChange(0, value)}
                onChange={(field, value) => handleUpdateStop(0, field, value)} />
            </div>
          </div>
        )}
      </div>

      {/* Roteirização: Modo Automático vs Modo Manual */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#171922] border border-gray-800 p-4 rounded-xl">
        <div>
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            Estratégia de Roteirização Lalamove
          </span>
          <p className="text-xs text-gray-400 mt-0.5">
            {isRouteOptimized
              ? 'O algoritmo Lalamove calcula a rota ideal para menor distância e menor custo financeiro.'
              : 'Respeita rigorosamente a sequência manual definida abaixo (ideal para entregas com horários agendados).'}
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg border border-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setIsRouteOptimized(true)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              isRouteOptimized
                ? 'bg-[#F26522] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automático (Melhor Rota)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRouteOptimized(false)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              !isRouteOptimized
                ? 'bg-gray-700 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manual (Ajuste Fino)</span>
          </button>
        </div>
      </div>

      {/* Lista de Destinos / Paradas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <span>Paradas de Destino</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs text-gray-400 border border-gray-700">
              {deliveryStops.length} {deliveryStops.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </h4>

          <button
            type="button"
            onClick={handleAddStop}
            className="flex items-center space-x-1.5 text-xs font-semibold text-[#F26522] hover:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Parada</span>
          </button>
        </div>

        {deliveryStops.map((stop, dIdx) => {
          const actualIndex = dIdx + 1; // index 0 é a origem
          return (
            <div
              key={stop.id}
              className={`bg-[#171922] border rounded-xl p-5 transition-all space-y-4 ${
                stop.isWarehouse
                  ? 'border-orange-500/40 hover:border-orange-500/60'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 text-xs font-bold text-white flex items-center justify-center">
                    {actualIndex}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    Destino {actualIndex}
                  </span>
                  {stop.isWarehouse && (
                    <span className="text-[10px] bg-orange-500/10 text-[#F26522] border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">
                      Matriz • CEP 01514-001, nº 557
                    </span>
                  )}
                  {stop.coordinates?.lat && stop.coordinates?.lng && (
                    <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                      ({stop.coordinates.lat}, {stop.coordinates.lng})
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  {!isRouteOptimized && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMoveStop(actualIndex, 'up')}
                        disabled={actualIndex === 1}
                        title="Mover parada para cima"
                        className="p-1.5 rounded-md text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStop(actualIndex, 'down')}
                        disabled={actualIndex === stops.length - 1}
                        title="Mover parada para baixo"
                        className="p-1.5 rounded-md text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {stops.length > 2 && !stop.isWarehouse && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(actualIndex)}
                      title="Remover esta parada"
                      className="p-1.5 rounded-md text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 ml-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Linha 1: Nome do Cliente e Telefone Obrigatório */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-gray-400" />
                    Nome / Razão Social do Destinatário *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder=""
                    value={stop.name}
                    onChange={(e) => handleUpdateStop(actualIndex, 'name', e.target.value)}
                    className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-orange-400" />
                    Telefone de Contato (Obrigatório para o motorista) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder=""
                    value={stop.phone}
                    onChange={(e) => handleUpdateStop(actualIndex, 'phone', e.target.value)}
                    className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <AddressFields stop={stop} label={`do destino ${actualIndex}`} loading={loadingCepIds[stop.id]}
                error={cepErrors[stop.id]} onCepChange={value => handleCepChange(actualIndex, value)}
                onChange={(field, value) => handleUpdateStop(actualIndex, field, value)} />

              {/* Linha 3: Observações de Entrega (Doca, Horário, Portaria) */}
              <div>
                <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Instruções para o Motorista (Opcional)
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={stop.remarks}
                  onChange={(e) => handleUpdateStop(actualIndex, 'remarks', e.target.value)}
                  className="mt-1 w-full bg-[#0F1117] border border-gray-700/80 rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


