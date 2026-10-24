import { CategorySales } from './category-sales.model';
import { SummaryReport, WeeklyPoint } from './summary.model';

// Todo lo que el Panel del comercio necesita, en una sola llamada.
export interface DashboardReport {
  displayName: string;
  summary: SummaryReport;
  categories: CategorySales[];
  weekly: WeeklyPoint[];
  pendingCount: number;
  expiringCount: number;
  // Opcionales: versiones de la API anteriores al 23/10/2026 no los envían.
  awaitingPickupCount?: number;
  unclaimedPendingCount?: number;
}
