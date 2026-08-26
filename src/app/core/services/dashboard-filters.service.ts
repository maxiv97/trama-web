import { Injectable, computed, signal } from '@angular/core';
import { ReportFilters, toReportParams } from '../models/report-filters.model';

// Holds the current "recorte" as signals so every dashboard card reads one source of truth.
// The dropdown options come from DashboardFilterOptionsService; this only holds the selection.
@Injectable({ providedIn: 'root' })
export class DashboardFiltersService {
  readonly from = signal<string | undefined>(undefined);
  readonly to = signal<string | undefined>(undefined);
  readonly salesPointId = signal<string | undefined>(undefined);
  readonly category = signal<string | undefined>(undefined);
  readonly consignorId = signal<string | undefined>(undefined);

  // The recorte the report/payout services consume.
  readonly current = computed<ReportFilters>(() => ({
    from: this.from(),
    to: this.to(),
    salesPointId: this.salesPointId(),
    category: this.category(),
    consignorId: this.consignorId(),
  }));

  readonly hasAny = computed(() => Object.keys(toReportParams(this.current())).length > 0);

  setPeriod(from?: string, to?: string): void {
    this.from.set(from);
    this.to.set(to);
  }

  setSalesPoint(salesPointId?: string): void {
    this.salesPointId.set(salesPointId);
  }

  setCategory(category?: string): void {
    this.category.set(category);
  }

  setConsignor(consignorId?: string): void {
    this.consignorId.set(consignorId);
  }

  clear(): void {
    this.from.set(undefined);
    this.to.set(undefined);
    this.salesPointId.set(undefined);
    this.category.set(undefined);
    this.consignorId.set(undefined);
  }
}
