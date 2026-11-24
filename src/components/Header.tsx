'use strict';
'use client';

import React from 'react';
import Link from 'next/link';
import { Truck, ShieldCheck, Activity, Settings, Package, History, Code2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'cotacao' | 'entregas' | 'historico';
  setActiveTab: (tab: 'cotacao' | 'entregas' | 'historico') => void;
  activeOrdersCount: number;
  onOpenSettings: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  activeOrdersCount,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header className="border-b border-gray-800 bg-[#12141a]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Subtitle */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D95314] to-[#F26522] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">
                  Lalamove<span className="text-[#F26522]">Express</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-medium border border-orange-500/20">
                  v3 API
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Expedição Inteligente & Gestão de Entregas Urbanas
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <Link href="/api" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60">
              <Code2 className="w-4 h-4" />
              <span>API</span>
            </Link>
            <button
              onClick={() => setActiveTab('cotacao')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'cotacao'
                  ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Nova Cotação</span>
            </button>

            <button
              onClick={() => setActiveTab('entregas')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium relative transition-all ${
                activeTab === 'entregas'
                  ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Entregas Ativas</span>
              {activeOrdersCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500 text-black">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'historico'
                  ? 'bg-[#F26522] text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico</span>
            </button>
          </nav>

          {/* Right Status & Settings */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-xs transition-colors cursor-pointer"
              title="Clique para configurar suas credenciais oficiais da Lalamove"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-300 font-medium">Tarifário Lalamove SP</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
            </button>

            <button
              onClick={onOpenSettings}
              title="Configurações e Chaves API"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}



