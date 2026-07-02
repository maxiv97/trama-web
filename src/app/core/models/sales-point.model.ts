export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ReceptionSchedule {
  days: string;
  hours: string;
  instructions: string;
}

export interface SalesPoint {
  id: string;
  merchantId: string;
  name: string;
  address: string;
  geo: GeoPoint;
  phone: string;
  receptionSchedule: ReceptionSchedule;
}
