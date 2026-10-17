import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CategoriesService } from './categories.service';
import { ReportsService } from './reports.service';
import { SalesPointsService } from './sales-points.service';

export interface FilterOption {
  value: string;
  label: string;
}

// Feeds the recorte dropdowns: categories, sales points and consignors come from
// the merchant's own data (el catálogo de categorías del comercio, base + propias).
@Injectable({ providedIn: 'root' })
export class DashboardFilterOptionsService {
  private readonly salesPointsService = inject(SalesPointsService);
  private readonly reportsService = inject(ReportsService);
  private readonly categoriesService = inject(CategoriesService);

  categories(merchantId: string): Observable<FilterOption[]> {
    return this.categoriesService
      .forMerchant(merchantId)
      .pipe(map((categories) => categories.map((c) => ({ value: c.label, label: c.label }))));
  }

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
