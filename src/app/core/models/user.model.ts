import { SalesPoint } from './sales-point.model';

export type Role = 'consignor' | 'merchant';

export type AccountStatus = 'active' | 'pending' | 'suspended';

export interface UserLocation {
  street?: string;
  number?: string;
  unit?: string;
  neighborhood: string;
  city: string;
  lat?: number;
  lng?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  verified: boolean;
  createdAt: Date;
  accountStatus: AccountStatus;
  location: UserLocation;
}

export interface Consignor extends User {
  role: 'consignor';
  dni: string;
  bankDetails?: string;
}

export interface CommissionConfig {
  consignorPercentage: number;
  merchantPercentage: number;
}

export interface MerchantTerms {
  saleWindowMonths: number;
  // Días que tiene el cedente para entregar la prenda acordada (7 por defecto).
  deliveryDays: number;
  // Días para retirar la prenda que no se vendió, desde el fin de la ventana de venta (15).
  pickupDays: number;
  payoutDay: number;
}

export interface Merchant extends User {
  role: 'merchant';
  businessName: string;
  salesPoints: SalesPoint[];
  commissionConfig: CommissionConfig;
  terms: MerchantTerms;
}
