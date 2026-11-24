'use strict';
'use client';

import React, { useState, useEffect } from 'react';
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

const INITIAL_STOPS: StopAddress[] = [
  {
    id: 'origin_0',
    isOrigin: true,
    name: 'Expedição Matriz (Guardanapos & Descartáveis)',
    phone: '+55 11 3333-4444',
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
  const [confirmingOrder, setConfirmingOrder] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pedidos e Modais
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRouteComparisonOpen, setIsRouteComparisonOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Carrega lista de pedidos do backend
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/lalamove/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error('Falha ao buscar pedidos', e);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Dispara cotação Lalamove
  const handleRequestQuotation = async () => {
    setLoadingQuotation(true);
    setErrorMessage(null);

    try {
      const payload = {
        data: {
          serviceType: selectedService,
          deliveryTier: selectedTier,
          specialRequests,
          language: 'pt_BR',
          isRouteOptimized,
          stops: stops.map((s) => ({
            coordinates: s.coordinates,
            address: s.address,
            remarks: s.remarks,
          })),
          item: {
            quantity: String(quantityBoxes + additionalVolumes.reduce((sum, volume) => sum + Math.max(1, volume.quantityBoxes || 1), 0)),
            weight: (weightPerBoxKg * quantityBoxes + additionalVolumes.reduce((sum, volume) => sum + (volume.weightPerBoxKg * volume.quantityBoxes), 0)) > 10 ? 'MORE_THAN_10KG' : 'LESS_THAN_10KG',
            categories: ['OFFICE_SUPPLIES'],
            handlingInstructions: specialRequests.includes('KEEP_DRY')
              ? ['KEEP_DRY']
              : ['FRAGILE'],
          },
          scheduleAt: scheduleAt || undefined,
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
      setQuotation(quoteData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar cotação');
    } finally {
      setLoadingQuotation(false);
    }
  };

  // Contrata a corrida
  const handleConfirmOrder = async () => {
    if (!quotation) return;

    setConfirmingOrder(true);
    setErrorMessage(null);

    try {
      const origin = stops[0];
      const recipients = stops.slice(1).map((s) => ({
        name: s.name || 'Cliente Destinatário',
        phone: s.phone || '+5511999990000',
        remarks: s.remarks,
      }));

      const finalPrice =
        selectedTier === 'PRIORITY'
          ? quotation.priceBreakdown.priorityPrice || quotation.priceBreakdown.total
          : selectedTier === 'POOLED'
          ? quotation.priceBreakdown.pooledPrice || quotation.priceBreakdown.total
          : quotation.priceBreakdown.regularPrice || quotation.priceBreakdown.total;

      const res = await fetch('/api/lalamove/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: quotation.quotationId,
          deliveryTier: selectedTier,
          priceBreakdown: {
            ...quotation.priceBreakdown,
            total: finalPrice,
          },
          sender: {
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
      setConfirmingOrder(false);
    }
  };

  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'COMPLETED' && o.status !== 'CANCELED'
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
                disabled={loadingQuotation}
                onClick={handleRequestQuotation}
                className="w-full py-4 px-6 rounded-xl font-extrabold text-base bg-gradient-to-r from-[#D95314] via-[#F26522] to-[#FF7A00] hover:opacity-95 text-white shadow-xl shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center space-x-2"
              >
                {loadingQuotation ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Consultando Tarifas Lalamove Oficial...</span>
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
                  setSelectedTier={setSelectedTier}
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



