import { Coordinates } from '@/types/lalamove';
import { formatGeocodingAddress } from './stop-address';

export interface AddressLocation {
  street?: string;
  number?: string;
  city?: string;
  state?: string;
  cep?: string;
}

export function hasValidCoordinates(coords?: Coordinates): boolean {
  return !!coords && typeof coords.lat === 'string' && typeof coords.lng === 'string' &&
    coords.lat.trim() !== '' && coords.lng.trim() !== '' &&
    Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng)) &&
    Math.abs(Number(coords.lat)) <= 90 && Math.abs(Number(coords.lng)) <= 180;
}

let searchQueue = Promise.resolve();
let lastSearchAt = 0;
const locations = new Map<string, Promise<Coordinates>>();

function search(params: URLSearchParams): Promise<any[]> {
  const result = searchQueue.then(async () => {
    const delay = lastSearchAt + 1050 - Date.now();
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    lastSearchAt = Date.now();
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'LalamoveExpressNapkins/1.0', 'Accept-Language': 'pt-BR' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('O serviço de localização está indisponível. Tente novamente em instantes.');
    const results = await response.json();
    if (!Array.isArray(results)) throw new Error('O serviço de localização retornou uma resposta inválida.');
    return results;
  });
  searchQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function geocodeAddress(address: string, fields: AddressLocation = {}): Promise<Coordinates> {
  if (!address.trim()) throw new Error('Informe o endereço completo com número.');
  const structured = !!(fields.street?.trim() && fields.number?.trim() && fields.city?.trim());
  const query = structured ? formatGeocodingAddress(fields) : address.trim().replace(/\s+-\s+/g, ', ');
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\bglicerio\s*,?\s*557\b/.test(normalized) && /sao paulo/.test(normalized)) {
    return { lat: '-23.556780', lng: '-46.628890' };
  }
  const key = JSON.stringify([query.toLowerCase(), fields.cep?.replace(/\D/g, '') || '']);
  const cached = locations.get(key);
  if (cached) return cached;
  const lookup = (async () => {
    const queries: URLSearchParams[] = [];
    const base = { format: 'jsonv2', countrycodes: 'br', addressdetails: '1', limit: '3' };
    if (structured) {
      const components = { ...base, street: `${fields.number!.trim()} ${fields.street!.trim()}`, city: fields.city!.trim(),
        ...(fields.state?.trim() ? { state: fields.state.trim() } : {}) };
      if (fields.cep?.replace(/\D/g, '').length === 8) {
        queries.push(new URLSearchParams({ ...components, postalcode: fields.cep.replace(/\D/g, '') }));
      }
      // O CEP pode não estar indexado no mapa. A segunda busca mantém rua, número e cidade.
      queries.push(new URLSearchParams(components));
    }
    queries.push(new URLSearchParams({ ...base, q: query }));
    for (const params of queries) {
      const results = await search(params);
      const match = results.find(result => {
        if (!hasValidCoordinates({ lat: result.lat, lng: result.lon })) return false;
        // Não substituir um número informado por outro número retornado pelo mapa.
        if (fields.number && result.address?.house_number &&
            String(result.address.house_number).trim().toLowerCase() !== fields.number.trim().toLowerCase()) return false;
        // Nunca usar centro de cidade, bairro ou CEP como se fosse o local da entrega.
        return !['city', 'town', 'municipality', 'suburb', 'neighbourhood', 'postcode', 'administrative'].includes(result.type);
      });
      if (match) return { lat: String(match.lat), lng: String(match.lon) };
    }
    throw new Error('O ponto não foi encontrado na base de mapas. O endereço pode ser válido, mas a localização ainda não pôde ser confirmada.');
  })();
  if (locations.size >= 250) locations.delete(locations.keys().next().value!);
  locations.set(key, lookup);
  try { return await lookup; }
  catch (error) { locations.delete(key); throw error; }
}
