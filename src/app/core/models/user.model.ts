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
  graceMonths: number;
  payoutDay: number;
}

export interface Merchant extends User {
  role: 'merchant';
  businessName: string;
  salesPoints: SalesPoint[];
  commissionConfig: CommissionConfig;
  terms: MerchantTerms;
}
