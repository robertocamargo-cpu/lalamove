import { StopAddress } from '@/types/lalamove';

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

type AddressFields = Pick<StopAddress, 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'cep'>;

export function formatStopAddress(stop: Partial<AddressFields>): string {
  const streetAndNumber = [stop.street?.trim(), stop.number?.trim()].filter(Boolean).join(', ');
  return [streetAndNumber, stop.complement?.trim(), stop.neighborhood?.trim(), stop.city?.trim(),
    stop.state?.trim(), stop.cep ? `CEP ${formatCep(stop.cep)}` : ''].filter(Boolean).join(' - ');
}

export function formatGeocodingAddress(stop: Partial<AddressFields>): string {
  return [[stop.street?.trim(), stop.number?.trim()].filter(Boolean).join(', '),
    stop.city?.trim(), stop.state?.trim(), 'Brasil'].filter(Boolean).join(', ');
}

export function formatDeliveryRemarks(stop: Pick<StopAddress, 'complement' | 'remarks'>): string | undefined {
  return [stop.complement?.trim() ? `Complemento: ${stop.complement.trim()}` : '', stop.remarks?.trim()]
    .filter(Boolean).join('\r\n') || undefined;
}

export interface CepAddress {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export function applyCepAddress(stops: StopAddress[], stopId: string, requestedCep: string, data: CepAddress): StopAddress[] {
  return stops.map(stop => {
    if (stop.id !== stopId || stop.cep.replace(/\D/g, '') !== requestedCep) return stop;
    const updated = { ...stop, cep: formatCep(requestedCep), street: data.street || '',
      neighborhood: data.neighborhood || '', city: data.city || '', state: data.state || '',
      coordinates: { lat: '', lng: '' } };
    return { ...updated, address: formatStopAddress(updated) };
  });
}
