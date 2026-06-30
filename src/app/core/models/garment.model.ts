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

export interface GarmentEvent {
  date: Date;
  actor: EventActor;
  status: GarmentStatus;
  note?: string;
}
