import { ReceptionDiscrepancy } from './reception.model';

export interface DiscrepancyTypeCount {
  discrepancy: ReceptionDiscrepancy;
  count: number;
}

export interface ReceptionDiscrepancyReport {
  totalReceptions: number;
  withDiscrepancies: number;
  rate: number | null;
  byType: DiscrepancyTypeCount[];
}
