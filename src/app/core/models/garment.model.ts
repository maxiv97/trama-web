export type GarmentStatus =
  | 'submitted'
  | 'under_review'
  | 'counteroffer'
  | 'agreed'
  | 'in_stock'
  | 'with_remarks'
  | 'rejected'
  | 'sold'
  | 'paid_out'
  | 'no_agreement';

export type EventActor = 'consignor' | 'merchant' | 'system';

export type GarmentCondition = 'new' | 'very_good' | 'good' | 'fair';

export interface GarmentEvent {
  date: Date;
  actor: EventActor;
  status: GarmentStatus;
  note?: string;
}

export interface Garment {
  id: string;
  consignorId: string;
  merchantId?: string;
  name: string;
  category: string;
  subcategory?: string;
  brand: string;
  size: string;
  color: string;
  season: string;
  condition: GarmentCondition;
  description: string;
  photos: string[];
  video?: string;
  status: GarmentStatus;
  createdAt: Date;
  salesPointId?: string;
  timeline: GarmentEvent[];
}
