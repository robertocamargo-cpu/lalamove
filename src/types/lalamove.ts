// Types for Lalamove API v3 and Express Delivery System

export type LalamoveServiceType =
  | 'LALAPRO'    // Moto com baú (0.4 x 0.4 x 0.3m, até 20kg) - Padrão do site
  | 'LALAGO'     // Moto sem baú (documentos e pequenas encomendas)
  | 'HATCHBACK'  // Carro Hatch
  | 'CAR'        // Carro Sedan / Passeio
  | 'UV_FIORINO'        // Utilitário e Pick-Up (Fiorino, Strada, etc.)
  | 'VAN'        // Van de Carga (Master, Sprinter)
  | 'TRUCK330';     // Caminhão Baú

export type DeliveryTier = 'PRIORITY' | 'REGULAR' | 'POOLED'; // Prioridade, Regular, Agrupado

export type SpecialRequest =
  | 'LOADING_1DRIVER_MAX030MIN'
  | 'LOADING_1DRIVER1HELPER_MAX060MIN'
  | 'LOADING_1DRIVER1HELPER_MAX120MIN'
  | 'LOADING_1DRIVER1HELPER_MAX180MIN'
  | 'RETURN'
  | 'THERMAL_BAG_1';

export interface Coordinates {
  lat: string;
  lng: string;
}

export interface StopAddress {
  id: string;
  isOrigin?: boolean;
  /** Marca o endereço fixo da matriz (CEP 01514-001, nº 557), que pode ocupar a origem ou o destino. */
  isWarehouse?: boolean;
  name: string;
  phone: string;
  address: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep: string;
  coordinates: Coordinates;
  remarks?: string;
}

export interface CargoItem {
  quantity: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  categories: string[];
  handlingInstructions: string[];
  productType: string;
}

export interface QuotationRequest {
  serviceType: LalamoveServiceType;
  deliveryTier?: DeliveryTier;
  specialRequests?: SpecialRequest[];
  language?: string;
  isRouteOptimized: boolean;
  stops: Array<{
    coordinates: Coordinates;
    address: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
    remarks?: string;
  }>;
  item?: {
    quantity: string;
    weight: string;
    categories: string[];
    handlingInstructions: string[];
  };
  scheduleAt?: string;
}

export interface PriceBreakdown {
  currency: string;
  base: string;
  extraMileage: string;
  surcharge: string;
  total: string;
  discount?: string;
  priorityPrice?: string;
  regularPrice?: string;
  pooledPrice?: string;
}

export interface StopQuotationResult {
  stopId?: string;
  coordinates: Coordinates;
  address: string;
  originalIndex?: number;
  optimizedIndex?: number;
}

export interface QuotationResponse {
  quotationId: string;
  serviceType: LalamoveServiceType;
  deliveryTier?: DeliveryTier;
  scheduleAt?: string;
  expiresAt: string;
  priceBreakdown: PriceBreakdown;
  distance: {
    value: string; // in meters
    text: string;  // e.g. "21.7 km"
  };
  stops: StopQuotationResult[];
  isRouteOptimized: boolean;
  savingsVsManual?: {
    kmSaved: number;
    priceSavedBrl: number;
  };
  isLiveApi?: boolean;
  apiEnv?: 'production' | 'sandbox';
  createdAt: string;
}

export type OrderStatus =
  | 'ASSIGNING_DRIVER'
  | 'ON_GOING'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  plate: string;
  vehicleModel: string;
  photoUrl?: string;
  coordinates?: Coordinates;
}

export interface StopDeliveryStatus {
  stopId: string;
  address: string;
  clientName: string;
  clientPhone: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'FAILED' | 'UNKNOWN';
  shareLink?: string;
  coordinates?: Coordinates;
  remarks?: string;
  arrivedAt?: string;
  completedAt?: string;
  pod?: {
    signatureUrl?: string;
    photoUrl?: string;
    receiverName?: string;
    receiverDoc?: string;
    deliveredAt?: string;
  };
}

export interface Order {
  isLiveApi?: boolean;
  apiEnv?: 'production' | 'sandbox';
  source?: 'api' | 'csv';
  lastSyncedAt?: string;
  syncWarning?: string;
  driverId?: string;
  orderId: string;
  quotationId: string;
  serviceType: LalamoveServiceType;
  deliveryTier?: DeliveryTier;
  status: OrderStatus;
  createdAt: string;
  scheduleAt?: string;
  priceBreakdown: PriceBreakdown;
  distanceKm: string;
  driver?: DriverInfo;
  stops: StopDeliveryStatus[];
  isRouteOptimized: boolean;
  remarks?: string;
}
