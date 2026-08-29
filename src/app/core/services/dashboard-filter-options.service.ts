import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CATEGORIES } from '../models/garment-taxonomy';
import { ReportsService } from './reports.service';
import { SalesPointsService } from './sales-points.service';

export interface FilterOption {
  value: string;
  label: string;
}

// Feeds the recorte dropdowns: categories are the known taxonomy, sales points and consignors
// come from the merchant's own data.
@Injectable({ providedIn: 'root' })
export class DashboardFilterOptionsService {
  private readonly salesPointsService = inject(SalesPointsService);
  private readonly reportsService = inject(ReportsService);

  readonly categories: FilterOption[] = CATEGORIES.map((c) => ({ value: c.label, label: c.label }));

  salesPoints(merchantId: string): Observable<FilterOption[]> {
    return this.salesPointsService
      .byMerchant(merchantId)
      .pipe(map((points) => points.map((p) => ({ value: p.id, label: p.name }))));
  }

  consignors(): Observable<FilterOption[]> {
    return this.reportsService
      .consignors()
      .pipe(map((rows) => rows.map((c) => ({ value: c.consignorId, label: c.name }))));
  }
}
