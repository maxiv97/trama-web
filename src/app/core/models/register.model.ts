import { UserLocation } from './user.model';

export interface RegisterConsignorRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  dni: string;
  bankDetails: string;
  location: UserLocation;
}

export interface RegisterSalesPoint {
  name: string;
  address: string;
  phone: string;
  geo: { lat: number; lng: number };
  receptionSchedule: { days: string; hours: string; instructions: string };
}

export interface RegisterMerchantRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  businessName: string;
  cuit: string;
  location: UserLocation;
  commissionConfig: { consignorPercentage: number; merchantPercentage: number };
  terms: { saleWindowMonths: number; deliveryDays: number; pickupDays: number; payoutDay: number };
  salesPoint: RegisterSalesPoint;
}
