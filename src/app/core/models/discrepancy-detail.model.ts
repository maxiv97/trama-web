import { ReceptionDiscrepancy } from './reception.model';

export interface DiscrepancyDetailRow {
  garmentName: string;
  category: string;
  consignorName: string;
  receivedAt: string;
  daysInStock: number;
  discrepancies: ReceptionDiscrepancy[];
}
