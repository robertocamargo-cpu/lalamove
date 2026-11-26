import { LalamoveServiceType, DeliveryTier } from '@/types/lalamove';

export interface CubageResult {
  totalBoxes: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  cubedWeightKg: number;
  recommendedService: LalamoveServiceType;
  vehicleLabel: string;
  vehicleCapacity: string;
  reason: string;
  warnings: string[];
}

export interface VehicleSpec {
  type: LalamoveServiceType;
  label: string;
  categoryName: string;
  description: string;
  maxWeightKg: number;
  maxVolumeM3: number;
  dimensionsText: string;
  baseRateBrl: number;
  pricePerKmBrl: number;
  stopFeeBrl: number;
}

export const LALAMOVE_VEHICLES: Record<LalamoveServiceType, VehicleSpec> = {
  LALAPRO: {
    type: 'LALAPRO',
    label: 'LalaPro (Moto com Baú)',
    categoryName: 'LalaPro',
    description: 'Motos com baú fechado. 0.4 x 0.4 x 0.3m. Proteção contra chuva para guardanapos.',
    maxWeightKg: 20,
    maxVolumeM3: 0.048,
    dimensionsText: '0.4 x 0.4 x 0.3 Metros',
    baseRateBrl: 11.50,
    pricePerKmBrl: 2.20,
    stopFeeBrl: 9.80,
  },
  LALAGO: {
    type: 'LALAGO',
    label: 'LalaGo (Moto sem Baú)',
    categoryName: 'LalaGo',
    description: 'Motos sem baú, para envelopes e pacotes pequenos',
    maxWeightKg: 15,
    maxVolumeM3: 0.030,
    dimensionsText: '0.3 x 0.3 x 0.3 Metros',
    baseRateBrl: 9.50,
    pricePerKmBrl: 1.85,
    stopFeeBrl: 8.50,
  },
  HATCHBACK: {
    type: 'HATCHBACK',
    label: 'Carro Hatch',
    categoryName: 'Carro Hatch',
    description: 'Porta-malas compacto para até 4 a 6 caixas médias',
    maxWeightKg: 100,
    maxVolumeM3: 0.50,
    dimensionsText: '1.0 x 0.8 x 0.6 Metros',
    baseRateBrl: 22.00,
    pricePerKmBrl: 2.85,
    stopFeeBrl: 12.00,
  },
  CAR: {
    type: 'CAR',
    label: 'Carro Sedan',
    categoryName: 'Carro',
    description: 'Sedan com porta-malas espaçoso para encomendas médias',
    maxWeightKg: 150,
    maxVolumeM3: 0.80,
    dimensionsText: '1.2 x 0.9 x 0.7 Metros',
    baseRateBrl: 26.00,
    pricePerKmBrl: 3.10,
    stopFeeBrl: 14.00,
  },
  UV_FIORINO: {
    type: 'UV_FIORINO',
    label: 'Utilitário e Pick-Up (Fiorino)',
    categoryName: 'Utilitário e Pick-Up',
    description: 'Fiorino / Strada baú. Ideal para caixas volumosas de guardanapos de papel.',
    maxWeightKg: 500,
    maxVolumeM3: 3.0,
    dimensionsText: '1.6 x 1.2 x 1.1 Metros',
    baseRateBrl: 45.00,
    pricePerKmBrl: 4.10,
    stopFeeBrl: 18.00,
  },
  VAN: {
    type: 'VAN',
    label: 'Van de Carga (Master / Sprinter)',
    categoryName: 'Van',
    description: 'Grande capacidade para lotes volumosos de descartáveis',
    maxWeightKg: 1200,
    maxVolumeM3: 7.5,
    dimensionsText: '2.8 x 1.6 x 1.6 Metros',
    baseRateBrl: 90.00,
    pricePerKmBrl: 5.60,
    stopFeeBrl: 25.00,
  },
  TRUCK330: {
    type: 'TRUCK330',
    label: 'Caminhão Baú (3/4 ou Toco)',
    categoryName: 'Caminhão',
    description: 'Para cargas paletizadas ou grande volume industrial',
    maxWeightKg: 3500,
    maxVolumeM3: 20.0,
    dimensionsText: '4.5 x 2.1 x 2.2 Metros',
    baseRateBrl: 175.00,
    pricePerKmBrl: 7.90,
    stopFeeBrl: 40.00,
  },
};

export function calculateCubage(
  quantityBoxes: number,
  weightPerBoxKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): CubageResult {
  const safeQty = Math.max(1, quantityBoxes || 1);
  const safeWeight = Math.max(0.1, weightPerBoxKg || 0.1);
  const safeL = Math.max(1, lengthCm || 1);
  const safeW = Math.max(1, widthCm || 1);
  const safeH = Math.max(1, heightCm || 1);

  const singleBoxVolumeM3 = (safeL * safeW * safeH) / 1_000_000;
  const totalVolumeM3 = Number((singleBoxVolumeM3 * safeQty).toFixed(3));
  const totalWeightKg = Number((safeWeight * safeQty).toFixed(2));
  const cubedWeightKg = Number((totalVolumeM3 * 300).toFixed(2));

  const warnings: string[] = [];
  let recommendedService: LalamoveServiceType = 'LALAPRO';
  let reason = '';

  if (totalWeightKg > 1200 || totalVolumeM3 > 7.5) {
    recommendedService = 'TRUCK330';
    reason = `Volume elevado (${totalVolumeM3} m³) ou peso (${totalWeightKg} kg) requer Caminhão Baú.`;
  } else if (totalWeightKg > 500 || totalVolumeM3 > 3.0) {
    recommendedService = 'VAN';
    reason = `Carga volumosa (${totalVolumeM3} m³) excede capacidade de Fiorino; necessita Van.`;
  } else if (totalWeightKg > 100 || totalVolumeM3 > 0.50 || safeQty > 8) {
    recommendedService = 'UV_FIORINO';
    reason = `Ideal para Utilitário (Fiorino): ${safeQty} caixas ocupam ${totalVolumeM3} m³ (baú fechado e protegido).`;
  } else if (totalWeightKg > 20 || totalVolumeM3 > 0.048 || safeQty > 3) {
    recommendedService = 'HATCHBACK';
    reason = `Acomodável em Carro Hatch (${safeQty} caixas, ${totalVolumeM3} m³).`;
  } else {
    recommendedService = 'LALAPRO';
    reason = `Carga compacta (até 2 volumes pequenos, ${totalWeightKg} kg) apta para LalaPro (Moto com baú).`;
  }

  const isMoto = recommendedService === 'LALAPRO' || (recommendedService as any) === 'LALAGO';
  if (isMoto) {
    warnings.push('Para entregas de moto: caixas de guardanapos devem caber no baú térmico/mochila lacrada (0.4 x 0.4 x 0.3m).');
  } else {
    warnings.push('Carga de guardanapos/descartáveis: exija baú fechado para proteção contra intempéries.');
  }

  const spec = LALAMOVE_VEHICLES[recommendedService];

  return {
    totalBoxes: safeQty,
    totalWeightKg,
    totalVolumeM3,
    cubedWeightKg,
    recommendedService,
    vehicleLabel: spec.label,
    vehicleCapacity: `Até ${spec.maxWeightKg}kg / ${spec.maxVolumeM3}m³`,
    reason,
    warnings,
  };
}
