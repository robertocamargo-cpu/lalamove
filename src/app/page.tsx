'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { StopForm } from '@/components/StopForm';
import { CubageCalculator } from '@/components/CubageCalculator';
import { QuotationCard } from '@/components/QuotationCard';
import { RouteComparisonModal } from '@/components/RouteComparisonModal';
import { ActiveOrdersView } from '@/components/ActiveOrdersView';
import { HistoryView } from '@/components/HistoryView';
import { SettingsModal } from '@/components/SettingsModal';
import {
  StopAddress,
  LalamoveServiceType,
  DeliveryTier,
  SpecialRequest,
  QuotationResponse,
  Order,
} from '@/types/lalamove';
import { Sparkles, Calculator, AlertCircle } from 'lucide-react';
import { CargoVolume } from '@/lib/cubage-multi';
import { formatDeliveryRemarks } from '@/lib/stop-address';

const INITIAL_STOPS: StopAddress[] = [
  {
    id: 'origin_0',
    isOrigin: true,
    isWarehouse: true,
    name: 'Nevine Liberdade (Vinicius)',
    phone: '+55 11 94708-4941',
    address: 'Rua do Glicério, 557 — Liberdade, São Paulo - SP',
    street: 'Rua do Glicério',
    number: '557',
    neighborhood: 'Liberdade',
    city: 'São Paulo',
    state: 'SP',
    cep: '01514-001',
    coordinates: { lat: '-23.556780', lng: '-46.628890' },
    remarks: 'Portão 2 de carga e descarga',
  },
  {
    id: 'dest_1',
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
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<'cotacao' | 'entregas' | 'historico'>('cotacao');
  const [stops, setStops] = useState<StopAddress[]>(INITIAL_STOPS);
  const [isRouteOptimized, setIsRouteOptimized] = useState<boolean>(true);

  // Cubagem & Modal
  const [quantityBoxes, setQuantityBoxes] = useState<number>(2);
  const [weightPerBoxKg, setWeightPerBoxKg] = useState<number>(3.5);
  const [lengthCm, setLengthCm] = useState<number>(40);
  const [widthCm, setWidthCm] = useState<number>(35);
  const [heightCm, setHeightCm] = useState<number>(30);
  const [additionalVolumes, setAdditionalVolumes] = useState<CargoVolume[]>([]);
  const [selectedService, setSelectedService] = useState<LalamoveServiceType>('LALAPRO');
  const [selectedTier, setSelectedTier] = useState<DeliveryTier>('REGULAR');
  const [specialRequests, setSpecialRequests] = useState<SpecialRequest[]>([]);
  const [scheduleAt, setScheduleAt] = useState<string>('');

  // Cotação
  const [quotation, setQuotation] = useState<QuotationResponse | null>(null);
  const [loadingQuotation, setLoadingQuotation] = useState<boolean>(false);
  const [resolvingCep, setResolvingCep] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pedidos e Modais
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotedStops, setQuotedStops] = useState<StopAddress[]>([]);
  const quoteVersion = useRef(0);
  const submittingOrder = useRef(false);
  const [isRouteComparisonOpen, setIsRouteComparisonOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Carrega lista de pedidos do backend
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/lalamove/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        throw new Error('Não foi possível atualizar as entregas.');
      }
    } catch (e) {
      setErrorMessage('Não foi possível atualizar as entregas. Tente novamente.');
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    quoteVersion.current++;
    setQuotation(null);
    setLoadingQuotation(false);
  }, [stops, selectedService, specialRequests, scheduleAt, isRouteOptimized, quantityBoxes, weightPerBoxKg, lengthCm, widthCm, heightCm, additionalVolumes]);

  // Dispara cotação Lalamove
  const requestQuotation = async (tier: DeliveryTier = selectedTier) => {
    if (resolvingCep) return;
    const incompleteCep = stops.findIndex(stop => stop.cep && stop.cep.replace(/\D/g, '').length !== 8);
    if (incompleteCep >= 0) {
      setErrorMessage(`Informe os 8 dígitos do CEP da ${incompleteCep === 0 ? 'origem' : `parada ${incompleteCep}`}.`);
      return;
    }
    const missingNumber = stops.findIndex(stop => stop.street && !stop.number?.trim());
    if (missingNumber >= 0) {
      setErrorMessage(`Informe o número do imóvel da ${missingNumber === 0 ? 'origem' : `parada ${missingNumber}`} antes de cotar.`);
      return;
    }
    const version = ++quoteVersion.current;
    const stopSnapshot = stops.map(s => ({ ...s, coordinates: { ...s.coordinates } }));
    setQuotation(null);
    setLoadingQuotation(true);
    setErrorMessage(null);

    try {
      const payload = {
        data: {
          serviceType: selectedService,
          deliveryTier: tier,
          specialRequests,
          language: 'pt_BR',
          isRouteOptimized,
          stops: stops.map((s) => ({
            coordinates: s.coordinates,
            address: s.address,
            street: s.street, number: s.number, complement: s.complement,
            neighborhood: s.neighborhood, city: s.city, state: s.state, cep: s.cep,
            remarks: formatDeliveryRemarks(s),
          })),
          scheduleAt: scheduleAt ? new Date(scheduleAt).toISOString() : undefined,
        },
      };

      const res = await fetch('/api/lalamove/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao obter cotação');
      }

      const quoteData: QuotationResponse = await res.json();
      if (version !== quoteVersion.current) return;
      setQuotedStops(quoteData.stops.map(s => stopSnapshot[s.originalIndex!]));
      setQuotation(quoteData);
    } catch (err: any) {
      if (version === quoteVersion.current) setErrorMessage(err.message || 'Erro ao processar cotação');
    } finally {
      if (version === quoteVersion.current) setLoadingQuotation(false);
    }
  };
  const handleRequestQuotation = () => requestQuotation(selectedTier);

  // Contrata a corrida
  const handleConfirmOrder = async () => {
    if (!quotation || submittingOrder.current) return;
    submittingOrder.current = true;

    setConfirmingOrder(true);
    setErrorMessage(null);

    try {
      const origin = quotedStops[0];
      const recipients = quotedStops.slice(1).map((s, i) => ({
        stopId: quotation.stops[i + 1].stopId,
        name: s.name, phone: s.phone, remarks: formatDeliveryRemarks(s),
      }));

      const res = await fetch('/api/lalamove/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: quotation.quotationId,
          sender: {
            stopId: quotation.stops[0].stopId,
            name: origin.name,
            phone: origin.phone,
          },
          recipients,
          remarks: 'Guardanapos de papel e descartáveis - Manter Seco',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao confirmar corrida');
      }

      await fetchOrders();
      setActiveTab('entregas');
      setQuotation(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao contratar corrida');
    } finally {
      submittingOrder.current = false;
      setConfirmingOrder(false);
    }
  };

  const activeOrdersCount = orders.filter(
    (o) => o.isLiveApi && !['COMPLETED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(o.status)
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#0F1117]">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeOrdersCount={activeOrdersCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="text-xs font-semibold">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-white underline"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Tab 1: Nova Cotação & Expedição */}
        {activeTab === 'cotacao' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <StopForm
                stops={stops}
                setStops={setStops}
                isRouteOptimized={isRouteOptimized}
                setIsRouteOptimized={setIsRouteOptimized}
                onCepLookupStateChange={setResolvingCep}
              />

              <CubageCalculator
                quantityBoxes={quantityBoxes}
                setQuantityBoxes={setQuantityBoxes}
                weightPerBoxKg={weightPerBoxKg}
                setWeightPerBoxKg={setWeightPerBoxKg}
                lengthCm={lengthCm}
                setLengthCm={setLengthCm}
                widthCm={widthCm}
                setWidthCm={setWidthCm}
                heightCm={heightCm}
                setHeightCm={setHeightCm}
                additionalVolumes={additionalVolumes}
                setAdditionalVolumes={setAdditionalVolumes}
                selectedService={selectedService}
                setSelectedService={setSelectedService}
                specialRequests={specialRequests}
                setSpecialRequests={setSpecialRequests}
                scheduleAt={scheduleAt}
                setScheduleAt={setScheduleAt}
              />

              <button
                type="button"
                disabled={loadingQuotation || resolvingCep}
                onClick={handleRequestQuotation}
                className="w-full py-4 px-6 rounded-xl font-extrabold text-base bg-gradient-to-r from-[#D95314] via-[#F26522] to-[#FF7A00] hover:opacity-95 text-white shadow-xl shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center space-x-2"
              >
                {loadingQuotation || resolvingCep ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{resolvingCep ? 'Consultando CEP...' : 'Consultando Tarifas Lalamove Oficial...'}</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    <span>Cotar com API Lalamove v3</span>
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="sticky top-24">
                <QuotationCard
                  quotation={quotation}
                  loading={loadingQuotation}
                  selectedTier={selectedTier}
                  setSelectedTier={(tier) => { setSelectedTier(tier); requestQuotation(tier); }}
                  onRefreshQuotation={handleRequestQuotation}
                  onConfirmOrder={handleConfirmOrder}
                  onCompareRoutes={() => setIsRouteComparisonOpen(true)}
                  confirmingOrder={confirmingOrder}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Entregas Ativas & Rastreamento */}
        {activeTab === 'entregas' && (
          <ActiveOrdersView
            orders={orders}
            onRefreshOrders={fetchOrders}
          />
        )}

        {/* Tab 3: Histórico de Expedição & Auditoria */}
        {activeTab === 'historico' && (
          <HistoryView orders={orders} onRefreshOrders={fetchOrders} />
        )}
      </main>

      <RouteComparisonModal
        isOpen={isRouteComparisonOpen}
        onClose={() => setIsRouteComparisonOpen(false)}
        quotation={quotation}
        manualStops={stops}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}



