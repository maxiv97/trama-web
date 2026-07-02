export type ReceptionResult = 'accepted' | 'with_remarks' | 'rejected';

export type ReceptionDiscrepancy =
  | 'condition'
  | 'damage'
  | 'photo_mismatch'
  | 'measurements'
  | 'accessories'
  | 'hygiene';

export interface Reception {
  id: string;
  garmentId: string;
  receivedAt: Date;
  salesPointId: string;
  result: ReceptionResult;
  discrepancies: ReceptionDiscrepancy[];
  detail?: string;
  evidence: string[];
  receiptNumber: string;
  handledBy: string;
}
