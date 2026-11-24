'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [env, setEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [mockFallback, setMockFallback] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setApiKey(data.apiKey || '');
          setEnv(data.env || 'sandbox');
          setMockFallback(data.mockFallback !== false);
        }
      })
      .catch((e) => console.error(e));
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          env,
          market: 'BR',
          mockFallback,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao salvar configurações');
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#171922] border border-gray-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-[#F26522]" />
            <h3 className="text-base font-bold text-white">
              Configurações da API Lalamove v3
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {savedSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Configurações salvas e aplicadas com sucesso no arquivo .env.local!</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-gray-300 font-semibold block mb-1">
              Ambiente da Lalamove:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnv('sandbox')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                  env === 'sandbox'
                    ? 'border-[#F26522] bg-[#F26522]/10 text-white'
                    : 'border-gray-800 bg-[#0F1117] text-gray-400 hover:text-white'
                }`}
              >
                Sandbox (Testes)
              </button>
              <button
                type="button"
                onClick={() => setEnv('production')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-all ${
                  env === 'production'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-gray-800 bg-[#0F1117] text-gray-400 hover:text-white'
                }`}
              >
                Produção (Preços Oficiais em Tempo Real)
              </button>
            </div>
          </div>

          <div>
            <label className="text-gray-300 font-semibold block mb-1">
              API Key (Lalamove Partner):
            </label>
            <input
              type="text"
              placeholder="Ex: pk_prod_xxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono placeholder-gray-600 focus:outline-none focus:border-[#F26522]"
            />
          </div>

          <div>
            <label className="text-gray-300 font-semibold block mb-1">
              API Secret:
            </label>
            <input
              type="password"
              placeholder="Ex: sk_prod_xxxxxxxxxxxxxx"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="w-full bg-[#0F1117] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono placeholder-gray-600 focus:outline-none focus:border-[#F26522]"
            />
          </div>

          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-gray-400">
            <span>Mercado:</span>
            <span className="font-mono text-white font-bold bg-gray-800 px-2 py-0.5 rounded">
              BR (Brasil - São Paulo)
            </span>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-800/80">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Links Oficiais:
            </span>
            <div className="flex gap-2">
              <a
                href="https://partner.lalamove.com/"
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center space-x-1 p-2 rounded-lg bg-[#0F1117] hover:bg-gray-800 text-gray-300 transition-colors border border-gray-800"
              >
                <span>Portal de Parceiros</span>
                <ExternalLink className="w-3 h-3 text-[#F26522]" />
              </a>
              <a
                href="https://developers.lalamove.com/#introduction"
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center space-x-1 p-2 rounded-lg bg-[#0F1117] hover:bg-gray-800 text-gray-300 transition-colors border border-gray-800"
              >
                <span>Docs API v3</span>
                <ExternalLink className="w-3 h-3 text-[#F26522]" />
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#F26522] hover:bg-[#D95314] text-white rounded-lg font-semibold flex items-center space-x-1.5 shadow"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar e Conectar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
