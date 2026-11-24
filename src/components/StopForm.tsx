'use strict';
'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
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

interface StopFormProps {
  stops: StopAddress[];
  setStops: React.Dispatch<React.SetStateAction<StopAddress[]>>;
  isRouteOptimized: boolean;
  setIsRouteOptimized: (val: boolean) => void;
}

export function StopForm({
  stops,
  setStops,
  isRouteOptimized,
  setIsRouteOptimized,
}: StopFormProps) {
  const [loadingCepIdx, setLoadingCepIdx] = useState<number | null>(null);
  const [showEditOrigin, setShowEditOrigin] = useState(false);

  // Consulta automática de CEP
  const handleCepLookup = async (index: number, cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCepIdx(index);
    try {
      const res = await fetch(`/api/cep/${cleanCep}`);
      if (res.ok) {
        const data = await res.json();
        const updated = [...stops];
        updated[index].street = data.street || '';
        updated[index].neighborhood = data.neighborhood || '';
        updated[index].city = data.city || 'São Paulo';
        updated[index].state = data.state || 'SP';
        updated[index].address = `${data.street ? data.street + ', ' : ''}${data.neighborhood || ''} - ${data.city || 'São Paulo'} - ${data.state || 'SP'}`;

        // Obtém coordenadas
        const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(updated[index].address)}&cep=${cleanCep}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.coordinates) {
            updated[index].coordinates = geoData.coordinates;
          }
        }

        setStops(updated);
      }
    } catch (err) {
      console.error('Falha ao consultar CEP', err);
    } finally {
      setLoadingCepIdx(null);
    }
  };

  const handleUpdateStop = (index: number, field: keyof StopAddress, value: any) => {
    const updated = [...stops];
    updated[index] = { ...updated[index], [field]: value };
    setStops(updated);
  };

  const handleAddStop = () => {
    const newStop: StopAddress = {
      id: `stop_${Date.now()}`,
      name: '',
      phone: '',
      address: '',
      street: '',
      number: '',
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

  const originStop = stops[0];
  const deliveryStops = stops.slice(1);

  return (
    <div className="space-y-6">
      {/* Origem Padrão Fixada */}
      <div className="bg-[#171922] border border-gray-800 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#F26522]" />

        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#F26522]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#F26522]">
                  Ponto de Coleta Padrão (Origem)
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  Coordenadas em Cache
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mt-0.5">
                {originStop?.name || 'Expedição Matriz (Guardanapos & Descartáveis)'}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {originStop?.address || 'Rua do Glicério, 557 — Liberdade, São Paulo - SP, CEP 01514-001'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowEditOrigin(!showEditOrigin)}
            className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-800 transition-colors border border-gray-700/60"
          >
            {showEditOrigin ? 'Ocultar Edição' : 'Alterar Origem'}
          </button>
        </div>

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
            <div>
              <label className="text-xs text-gray-400 font-medium">Endereço Completo</label>
              <input
                type="text"
                value={originStop.address}
                onChange={(e) => handleUpdateStop(0, 'address', e.target.value)}
                className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F26522]"
              />
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
              className="bg-[#171922] border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-all space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 text-xs font-bold text-white flex items-center justify-center">
                    {actualIndex}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    Destino {actualIndex}
                  </span>
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

                  {stops.length > 2 && (
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

              {/* Linha 2: CEP com Autopreenchimento e Endereço */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-[#F26522]" />
                    CEP Destino
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      maxLength={9}
                      placeholder=""
                      value={stop.cep}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateStop(actualIndex, 'cep', val);
                        if (val.replace(/\D/g, '').length === 8) {
                          handleCepLookup(actualIndex, val);
                        }
                      }}
                      className="w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F26522]"
                    />
                    {loadingCepIdx === actualIndex && (
                      <div className="absolute right-2.5 top-2.5">
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs font-medium text-gray-300">
                    Endereço Completo (Rua, Número, Bairro, Cidade - SP) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder=""
                    value={stop.address}
                    onChange={(e) => handleUpdateStop(actualIndex, 'address', e.target.value)}
                    onBlur={async () => {
                      if (!stop.address || stop.address.length < 5) return;
                      try {
                        const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(stop.address)}`);
                        if (geoRes.ok) {
                          const geoData = await geoRes.json();
                          if (geoData.coordinates) {
                            handleUpdateStop(actualIndex, 'coordinates', geoData.coordinates);
                          }
                        }
                      } catch (err) {
                        console.error('Falha ao geocodificar endereço', err);
                      }
                    }}
                    className="mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

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


