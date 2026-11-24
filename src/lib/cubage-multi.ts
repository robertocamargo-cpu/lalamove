import { LalamoveServiceType } from '@/types/lalamove';
import { LALAMOVE_VEHICLES } from './cubage';

export interface CargoVolume {
  id: string;
  quantityBoxes: number;
  weightPerBoxKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface MultiCubageResult {
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

export function calculateMultiCubage(volumes: CargoVolume[]): MultiCubageResult {
  const safeVolumes = volumes.length ? volumes : [{ id: 'volume_1', quantityBoxes: 1, weightPerBoxKg: 0.1, lengthCm: 1, widthCm: 1, heightCm: 1 }];
  const totalBoxes = safeVolumes.reduce((sum, volume) => sum + Math.max(1, volume.quantityBoxes || 1), 0);
  const totalWeightKg = Number(safeVolumes.reduce((sum, volume) => sum + Math.max(0.1, volume.weightPerBoxKg || 0.1) * Math.max(1, volume.quantityBoxes || 1), 0).toFixed(2));
  const totalVolumeM3 = Number(safeVolumes.reduce((sum, volume) => sum + (Math.max(1, volume.lengthCm || 1) * Math.max(1, volume.widthCm || 1) * Math.max(1, volume.heightCm || 1) * Math.max(1, volume.quantityBoxes || 1)) / 1_000_000, 0).toFixed(3));
  const cubedWeightKg = Number((totalVolumeM3 * 300).toFixed(2));
  let recommendedService: LalamoveServiceType = 'LALAPRO';
  let reason = '';
  if (totalWeightKg > 1200 || totalVolumeM3 > 7.5) { recommendedService = 'TRUCK'; reason = `Volume elevado (${totalVolumeM3} m³) ou peso (${totalWeightKg} kg) requer Caminhão Baú.`; }
  else if (totalWeightKg > 500 || totalVolumeM3 > 3.0) { recommendedService = 'VAN'; reason = `Carga volumosa (${totalVolumeM3} m³) excede a capacidade de Fiorino; necessita Van.`; }
  else if (totalWeightKg > 100 || totalVolumeM3 > 0.50 || totalBoxes > 8) { recommendedService = 'LUV'; reason = `Ideal para Utilitário (Fiorino): ${totalBoxes} caixas ocupam ${totalVolumeM3} m³.`; }
  else if (totalWeightKg > 20 || totalVolumeM3 > 0.048 || totalBoxes > 3) { recommendedService = 'HATCHBACK'; reason = `Acomodável em Carro Hatch (${totalBoxes} caixas, ${totalVolumeM3} m³).`; }
  else { reason = `Carga compacta (${totalBoxes} caixas, ${totalWeightKg} kg) apta para LalaPro.`; }
  const spec = LALAMOVE_VEHICLES[recommendedService];
  return { totalBoxes, totalWeightKg, totalVolumeM3, cubedWeightKg, recommendedService, vehicleLabel: spec.label, vehicleCapacity: `Até ${spec.maxWeightKg}kg / ${spec.maxVolumeM3}m³`, reason, warnings: [recommendedService === 'LALAPRO' ? 'Para entregas de moto, as caixas devem caber no baú/mochila lacrada.' : 'Exija baú fechado para proteger os produtos contra umidade.'] };
}


