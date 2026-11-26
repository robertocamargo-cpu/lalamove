'use client';

import React from 'react';
import { StopAddress } from '@/types/lalamove';
import { formatStopAddress } from '@/lib/stop-address';

interface Props {
  stop: StopAddress;
  label: string;
  loading?: boolean;
  error?: string;
  onCepChange: (value: string) => void;
  onChange: (field: keyof StopAddress, value: string) => void;
}

export function AddressFields({ stop, label, loading, error, onCepChange, onChange }: Props) {
  const inputClass = 'mt-1 w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#F26522]';
  const field = (name: keyof StopAddress, title: string, width = '') => (
    <label className={`block text-xs font-medium text-gray-300 ${width}`}>
      {title}
      <input type="text" aria-label={`${title} ${label}`} value={String(stop[name] || '')}
        onChange={event => onChange(name, event.target.value)} className={inputClass} />
    </label>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <label className="block text-xs font-medium text-gray-300">
          CEP
          <input type="text" maxLength={9} inputMode="numeric" autoComplete="postal-code"
            aria-label={`CEP ${label}`} value={stop.cep} onChange={event => onCepChange(event.target.value)}
            className={inputClass} />
          {loading && <span role="status" className="mt-1 block text-orange-300">Consultando CEP...</span>}
          {error && <span role="alert" className="mt-1 block text-rose-300">{error}</span>}
        </label>
        {field('street', 'Rua / Logradouro', 'sm:col-span-3')}
        {field('number', 'Número')}
        {field('complement', 'Complemento', 'sm:col-span-3')}
        {field('neighborhood', 'Bairro', 'sm:col-span-2')}
        {field('city', 'Cidade')}
        {field('state', 'UF')}
      </div>
      <div className="rounded-xl border border-gray-700 bg-[#12141a] p-3">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Endereço completo</span>
        <output aria-label={`Endereço completo ${label}`} className="block text-sm text-white break-words">
          {stop.street ? formatStopAddress(stop) : stop.address || 'Preencha o CEP, a rua e o número do imóvel.'}
        </output>
      </div>
    </div>
  );
}
