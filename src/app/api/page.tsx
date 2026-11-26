'use strict';
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Search,
  ExternalLink,
  ShieldCheck,
  Send,
  Play,
  Layers,
  ChevronDown,
  ChevronRight,
  Zap,
  Info,
} from 'lucide-react';

interface ApiEndpointDoc {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  category: 'Cotação' | 'Pedidos' | 'Motoristas' | 'Cidades & Frota' | 'Webhooks & Geocoding';
  name: string;
  inUse: boolean;
  statusBadge: string;
  description: string;
  businessUseCase: string;
  requestExample?: string;
  responseExample: string;
  testableUrl?: string;
}

const API_ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: 'post-quotations',
    method: 'POST',
    path: '/v3/quotations',
    category: 'Cotação',
    name: 'Criar Cotação Dinâmica com Preço Congelado',
    inUse: true,
    statusBadge: 'EM USO NO SISTEMA',
    description:
      'Gera a cotação oficial da Lalamove com cálculo da rota ideal, distância em metros, breakdown de valores e congelamento da tarifa por 5 minutos (300 segundos).',
    businessUseCase:
      'Calcula o valor do frete para o cliente da expedição antes de despachar, permitindo escolher entre LalaPro, Utilitário ou Van, garantindo a margem do frete.',
    requestExample: `{
  "data": {
    "serviceType": "LALAPRO",
    "language": "pt_BR",
    "isRouteOptimized": true,
    "pricingTierCode": "1",
    "stops": [
      { "coordinates": { "lat": "-23.556780", "lng": "-46.628890" }, "address": "Rua do Glicério, 557 - SP" },
      { "coordinates": { "lat": "-23.561684", "lng": "-46.655981" }, "address": "Av. Paulista, 1000 - SP" }
    ]
  }
}`,
    responseExample: `{
  "data": {
    "quotationId": "3635925342855848091",
    "scheduleAt": "2026-11-24T14:56:48.00Z",
    "expiresAt": "2026-11-24T15:01:48.00Z",
    "serviceType": "LALAPRO",
    "priceBreakdown": { "base": "11.50", "extraMileage": "7.26", "total": "18.76", "currency": "BRL" },
    "distance": { "value": "4300", "text": "4.3 km" }
  }
}`,
  },
  {
    id: 'get-quotation-details',
    method: 'GET',
    path: '/v3/quotations/{quotationId}',
    category: 'Cotação',
    name: 'Consultar Detalhes da Cotação',
    inUse: true,
    statusBadge: 'EM USO NO SISTEMA',
    description:
      'Recupera os detalhes completos, paradas e status de validade de uma cotação gerada anteriormente.',
    businessUseCase:
      'Verificar se uma cotação ainda está dentro dos 5 minutos antes de enviar a ordem de contratação.',
    responseExample: `{
  "data": {
    "quotationId": "3635925342855848091",
    "expiresAt": "2026-11-24T15:01:48.00Z",
    "serviceType": "LALAPRO",
    "distance": { "value": "4300", "text": "4.3 km" },
    "priceBreakdown": { "total": "18.76", "currency": "BRL" }
  }
}`,
  },
  {
    id: 'post-orders',
    method: 'POST',
    path: '/v3/orders',
    category: 'Pedidos',
    name: 'Contratar Corrida / Disparar Pedido',
    inUse: true,
    statusBadge: 'EM USO NO SISTEMA',
    description:
      'Emite a ordem de corrida utilizando o quotationId ativo. Notifica imediatamente a malha de motoristas parceiros da Lalamove mais próximos da expedição.',
    businessUseCase:
      'Aciona a coleta dos guardanapos de papel na Rua do Glicério 557 e permite compartilhar o link de rastreio retornado pela Lalamove.',
    requestExample: `{
  "data": {
    "quotationId": "3635925342855848091",
    "sender": { "stopId": "ID_DA_ORIGEM_NA_COTACAO", "name": "Nevine Liberdade (Vinicius)", "phone": "+5511947084941" },
    "recipients": [
      { "stopId": "ID_DO_DESTINO_NA_COTACAO", "name": "Restaurante Central", "phone": "+5511999998888", "remarks": "Entregar na portaria" }
    ],
    "isPODEnabled": true,
    "metadata": { "department": "Expedicao-Guardanapos", "internalInvoice": "NF-10492" }
  }
}`,
    responseExample: `{
  "data": {
    "orderId": "3635925342855848095",
    "quotationId": "3635925342855848091",
    "status": "ASSIGNING_DRIVER",
    "shareLink": "VALOR_SHARELINK_RETORNADO_PELA_LALAMOVE"
  }
}`,
  },
  {
    id: 'get-orders-id',
    method: 'GET',
    path: '/v3/orders/{orderId}',
    category: 'Pedidos',
    name: 'Consultar Status e Detalhes do Pedido',
    inUse: true,
    statusBadge: 'EM USO NO SISTEMA',
    description:
      'Retorna todas as informações granulares de uma corrida (criada nos últimos 60 dias): status atual, motorista alocado, localização, link de rastreio e fotos de comprovante POD.',
    businessUseCase:
      'Atualizar o painel em tempo real e fornecer a página de rastreio detalhada para o time de atendimento e logística.',
    responseExample: `{
  "data": {
    "orderId": "3635925342855848095",
    "status": "COMPLETED",
    "priceBreakdown": { "total": "20.08", "currency": "BRL" },
    "driverId": "ID_RETORNADO_PELA_API",
    "stops": [
      { "address": "Rua do Glicério, 557", "status": "DELIVERED" },
      { "address": "Av. Paulista, 1000", "status": "DELIVERED", "POD": { "status": "DELIVERED", "image": "URL_DA_API", "deliveredAt": "2026-11-24T14:58:12Z" } }
    ]
  }
}`,
  },
  {
    id: 'patch-orders-id',
    method: 'PATCH',
    path: '/v3/orders/{orderId}',
    category: 'Pedidos',
    name: 'Editar Pedido em Andamento',
    inUse: true,
    statusBadge: 'IMPLANTADO NO SISTEMA',
    description:
      'Permite atualizar observações de entrega, instruções para o motorista ou contatos de paradas mesmo após o pedido já ter sido contratado.',
    businessUseCase:
      'Caso o cliente ligue avisando que mudou o recebedor ou que a doca mudou de portão, a expedição atualiza o chamado sem precisar cancelar a corrida.',
    requestExample: `{
  "data": {
    "stops": [
      { "coordinates": { "lat": "LAT_ORIGINAL", "lng": "LNG_ORIGINAL" }, "address": "COLETA_ORIGINAL", "name": "REMETENTE", "phone": "+5511947084941" },
      { "coordinates": { "lat": "LAT_DESTINO", "lng": "LNG_DESTINO" }, "address": "DESTINO", "name": "DESTINATARIO", "phone": "+5511999998888", "remarks": "Tocar interfone 32" }
    ]
  }
}`,
    responseExample: `{
  "data": {
    "orderId": "3635925342855848095",
    "status": "ON_GOING",
    "remarks": "Atenção: Entregar na doca dos fundos com o encarregado João."
  }
}`,
  },
  {
    id: 'delete-orders-id',
    method: 'DELETE',
    path: '/v3/orders/{orderId}',
    category: 'Pedidos',
    name: 'Cancelar Corrida Controladamente',
    inUse: true,
    statusBadge: 'EM USO NO SISTEMA',
    description:
      'Cancela um pedido ativo antes da coleta ou enquanto o motorista está a caminho.',
    businessUseCase:
      'Cancelamento imediato caso a carga sofra avaria na expedição antes do embarque ou o cliente cancele o pedido.',
    responseExample: `{
  "data": {
    "orderId": "3635925342855848095",
    "status": "CANCELED"
  }
}`,
  },
  {
    id: 'post-priority-fee',
    method: 'POST',
    path: '/v3/orders/{orderId}/priority-fee',
    category: 'Pedidos',
    name: 'Adicionar Taxa de Prioridade / Gorjeta',
    inUse: true,
    statusBadge: 'IMPLANTADO NO SISTEMA',
    description:
      'Adiciona um incentivo financeiro adicional (gorjeta/taxa de prioridade) a uma corrida já emitida para acelerar a aceitação por motoristas parceiros.',
    businessUseCase:
      'Em dias de muita chuva em São Paulo ou horários de pico onde motoboys demoram para aceitar, adiciona R$ 5 ou R$ 10 para incentivar a aceitação, conforme disponibilidade.',
    requestExample: `{
  "data": {
    "priorityFee": "10.00"
  }
}`,
    responseExample: `{
  "data": {
    "orderId": "3635925342855848095",
    "priorityFee": "10.00",
    "priceBreakdown": { "total": "30.08" }
  }
}`,
  },
  {
    id: 'get-driver-details',
    method: 'GET',
    path: '/v3/orders/{orderId}/drivers/{driverId}',
    category: 'Motoristas',
    name: 'Consultar Localização e Dados do Motorista',
    inUse: true,
    statusBadge: 'IMPLANTADO NO SISTEMA',
    description:
      'Retorna as coordenadas GPS ao vivo (latitude/longitude), telefone, foto e dados do veículo do motorista vinculado à corrida.',
    businessUseCase:
      'Consultar os dados do motorista quando disponibilizados pela Lalamove. A API pode retornar 403 fora da janela permitida.',
    responseExample: `{
  "data": {
    "driverId": "ID_RETORNADO_PELA_API",
    "name": "NOME_RETORNADO_PELA_API",
    "phone": "+5511987654321",
    "plateNumber": "PLACA_RETORNADA_PELA_API",
    "coordinates": { "lat": "-23.555500", "lng": "-46.630000" }
  }
}`,
  },
  {
    id: 'request-change-driver',
    method: 'DELETE',
    path: '/v3/orders/{orderId}/drivers/{driverId}',
    category: 'Motoristas',
    name: 'Solicitar Troca de Motorista por Atraso',
    inUse: true,
    statusBadge: 'EM USO NO SISTEMA',
    description:
      'Solicita à Lalamove a reatribuição da corrida para outro motorista parceiro caso o atual esteja parado ou demorando para chegar na coleta.',
    businessUseCase:
      'Garantir que a entrega não fique travada se o motorista furar o pneu ou atrasar no trânsito.',
    requestExample: `{
  "data": {
    "reason": "DRIVER_LATE"
  }
}`,
    responseExample: `{
  "data": {
    "orderId": "3635925342855848095",
    "status": "ASSIGNING_DRIVER"
  }
}`,
  },
  {
    id: 'delete-driver',
    method: 'DELETE',
    path: '/v3/orders/{orderId}/drivers/{driverId}',
    category: 'Motoristas',
    name: 'Desvincular / Rejeitar Motorista',
    inUse: true,
    statusBadge: 'IMPLANTADO NO SISTEMA',
    description:
      'Remove o motorista atual da corrida e volta o status para busca de um novo parceiro na rede.',
    businessUseCase:
      'Caso o motorista se recuse a levar as caixas de papel ou o veículo não tenha baú fechado estanque conforme solicitado.',
    responseExample: `{
  "data": {
    "orderId": "3635925342855848095",
    "status": "ASSIGNING_DRIVER"
  }
}`,
  },
  {
    id: 'get-cities',
    method: 'GET',
    path: '/v3/cities',
    category: 'Cidades & Frota',
    name: 'Listar Cidades, Modais e Requisições Especiais',
    inUse: true,
    statusBadge: 'IMPLANTADO NO SISTEMA',
    description:
      'Lista todas as cidades operadas pela Lalamove no Brasil (São Paulo, Rio de Janeiro, Curitiba, etc.), com dimensões de carga, peso máximo e opcionais suportados.',
    businessUseCase:
      'Carregar dinamicamente as categorias de veículos da Lalamove sem precisar fixar no código, suportando expansão para filiais em outras cidades do Brasil.',
    responseExample: `{
  "data": [
    {
      "locode": "BR SAO",
      "name": "São Paulo & Campinas",
      "services": [
        { "key": "LALAPRO", "load": { "value": "20", "unit": "kg" } },
        { "key": "UV_FIORINO", "load": { "value": "500", "unit": "kg" } },
        { "key": "VAN", "load": { "value": "1000", "unit": "kg" } },
        { "key": "TRUCK330", "load": { "value": "1500", "unit": "kg" } }
      ]
    }
  ]
}`,
    testableUrl: '/api/lalamove/cities',
  },
  {
    id: 'post-webhook',
    method: 'POST',
    path: '/v3/webhook',
    category: 'Webhooks & Geocoding',
    name: 'Webhooks Oficiais em Tempo Real',
    inUse: false,
    statusBadge: 'DISPONÍVEL NA API (POTENCIAL EXPANSÃO)',
    description:
      'A Lalamove pode enviar notificações HTTP sempre que ocorre uma alteração: motorista aceitou, chegou na coleta, mercadoria coletada, entregue com foto POD.',
    businessUseCase:
      'Enviar WhatsApp automático para o cliente no segundo em que a mercadoria for entregue, com a foto do comprovante, sem precisar de ninguém da expedição clicando em botões.',
    responseExample: `{
  "event": "ORDER_STATUS_CHANGED",
  "data": {
    "orderId": "3635925342855848095",
    "status": "COMPLETED",
    "timestamp": "2026-11-24T14:58:12.00Z"
  }
}`,
  },
];

export default function ApiDocumentationPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterInUse, setFilterInUse] = useState<'all' | 'in_use' | 'available'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('post-quotations');
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; data: any } | null>(null);

  const filteredEndpoints = API_ENDPOINTS.filter((ep) => {
    const matchesCategory = selectedCategory === 'all' || ep.category === selectedCategory;
    const matchesFilter =
      filterInUse === 'all' ||
      (filterInUse === 'in_use' && ep.inUse) ||
      (filterInUse === 'available' && !ep.inUse);
    const matchesSearch =
      ep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ep.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesFilter && matchesSearch;
  });

  const inUseCount = API_ENDPOINTS.filter((e) => e.inUse).length;
  const availableCount = API_ENDPOINTS.filter((e) => !e.inUse).length;

  const handleTestEndpoint = async (ep: ApiEndpointDoc) => {
    setTestingEndpoint(ep.id);
    setTestResult(null);

    try {
      let url = '/api/lalamove/cities';
      let method = 'GET';
      let body: any = null;

      if (ep.id === 'post-quotations') {
        url = '/api/lalamove/quotations';
        method = 'POST';
        body = JSON.parse(ep.requestExample || '{}');
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();
      setTestResult({ id: ep.id, data });
    } catch (err: any) {
      setTestResult({ id: ep.id, data: { error: err.message } });
    } finally {
      setTestingEndpoint(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#12141a]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-2 text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-800 transition-colors border border-gray-700/60"
            >
              <ArrowLeft className="w-4 h-4 text-orange-400" />
              <span>Voltar ao Sistema Principal</span>
            </Link>

            <span className="text-gray-600">|</span>

            <div className="flex items-center space-x-2">
              <Code2 className="w-5 h-5 text-[#F26522]" />
              <h1 className="text-base font-bold text-white tracking-tight">
                Painel Completo da API Lalamove v3
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Referência da API Lalamove v3</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Explicativo */}
        <div className="bg-gradient-to-r from-[#171922] via-[#1b1e2a] to-[#171922] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  Documentação Técnica & Auditoria de Recursos
                </span>
                <span className="text-xs text-gray-400 font-mono">v3 REST / HMAC-SHA256</span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">
                Mapa Completo de Recursos da API Lalamove Brasil
              </h2>
              <p className="text-xs text-gray-400 max-w-2xl mt-1 leading-relaxed">
                Abaixo estão listados <strong>todos os endpoints que a API oficial da Lalamove permite fazer</strong>.
                Identificamos detalhadamente quais já estão implantados no nosso sistema e quais estão disponíveis para expansão em outras rotinas da empresa.
              </p>
            </div>

            {/* Placar de Recursos */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="bg-[#12141a] border border-emerald-500/30 rounded-xl px-4 py-3 text-center">
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                  Em Uso / Implantados
                </span>
                <span className="text-2xl font-black text-white">{inUseCount}</span>
              </div>

              <div className="bg-[#12141a] border border-blue-500/30 rounded-xl px-4 py-3 text-center">
                <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">
                  Disponíveis na API
                </span>
                <span className="text-2xl font-black text-white">{availableCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Barra de Busca */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#171922] border border-gray-800 p-3.5 rounded-xl">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setFilterInUse('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterInUse === 'all'
                  ? 'bg-[#F26522] text-white shadow'
                  : 'bg-gray-800/80 text-gray-300 hover:text-white'
              }`}
            >
              Todos ({API_ENDPOINTS.length})
            </button>
            <button
              onClick={() => setFilterInUse('in_use')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterInUse === 'in_use'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-gray-800/80 text-gray-300 hover:text-white'
              }`}
            >
              ✓ Em Uso no Sistema ({inUseCount})
            </button>
            <button
              onClick={() => setFilterInUse('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterInUse === 'available'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-800/80 text-gray-300 hover:text-white'
              }`}
            >
              Potencial Expansão ({availableCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrar por nome ou endpoint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F1117] border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F26522]"
            />
          </div>
        </div>

        {/* Lista de Endpoints */}
        <div className="space-y-4">
          {filteredEndpoints.map((ep) => {
            const isExpanded = expandedId === ep.id;

            return (
              <div
                key={ep.id}
                className={`bg-[#171922] border rounded-2xl overflow-hidden transition-all shadow-md ${
                  isExpanded ? 'border-gray-700' : 'border-gray-800 hover:border-gray-700/80'
                }`}
              >
                {/* Header do Endpoint */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : ep.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-extrabold shrink-0 ${
                        ep.method === 'POST'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : ep.method === 'GET'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : ep.method === 'PATCH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {ep.method}
                    </span>

                    <div>
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-sm font-bold text-white tracking-tight">
                          {ep.path}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            ep.inUse
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {ep.statusBadge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 font-medium mt-0.5">{ep.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-semibold text-gray-500 bg-gray-900 px-2.5 py-1 rounded border border-gray-800">
                      {ep.category}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Conteúdo Expandido com Schemas e Caso de Uso */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-gray-800/80 bg-[#14161f] space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* O que faz */}
                      <div className="bg-[#171922] p-4 rounded-xl border border-gray-800 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                          Descrição Técnica do Endpoint:
                        </span>
                        <p className="text-gray-300 leading-relaxed">{ep.description}</p>
                      </div>

                      {/* Como podemos usar no negócio */}
                      <div className="bg-gradient-to-br from-orange-500/5 to-transparent p-4 rounded-xl border border-orange-500/20 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          Como nossa empresa pode usar:
                        </span>
                        <p className="text-gray-200 leading-relaxed font-medium">{ep.businessUseCase}</p>
                      </div>
                    </div>

                    {/* Exemplo de Requisição & Resposta */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ep.requestExample && (
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 block mb-1">
                            Payload de Requisição (Body JSON):
                          </span>
                          <pre className="bg-[#0A0C10] border border-gray-800 p-3 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-56">
                            {ep.requestExample}
                          </pre>
                        </div>
                      )}

                      <div className={ep.requestExample ? '' : 'md:col-span-2'}>
                        <span className="text-[11px] font-bold text-gray-400 block mb-1">
                          Resposta Oficial da Lalamove (Response JSON):
                        </span>
                        <pre className="bg-[#0A0C10] border border-gray-800 p-3 rounded-xl font-mono text-[11px] text-blue-300 overflow-x-auto max-h-56">
                          {ep.responseExample}
                        </pre>
                      </div>
                    </div>

                    {/* Botão de Testar se aplicável */}
                    <div className="pt-2 flex items-center justify-between border-t border-gray-800">
                      <span className="text-[11px] text-gray-500">
                        Autenticação: HMAC-SHA256 • Header Market: BR
                      </span>

                      {ep.id === 'get-cities' || ep.id === 'post-quotations' ? (
                        <button
                          type="button"
                          disabled={testingEndpoint === ep.id}
                          onClick={() => handleTestEndpoint(ep)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#F26522] hover:bg-[#D95314] text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{testingEndpoint === ep.id ? 'Testando...' : 'Testar Agora na API Oficial'}</span>
                        </button>
                      ) : null}
                    </div>

                    {/* Resultado do Teste ao Vivo */}
                    {testResult && testResult.id === ep.id && (
                      <div className="p-3 rounded-xl bg-black border border-emerald-500/40 space-y-1">
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Retorno ao Vivo da API Lalamove:
                        </span>
                        <pre className="font-mono text-[10px] text-gray-300 overflow-x-auto max-h-48">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
