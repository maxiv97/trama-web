import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategorySales } from '../models/category-sales.model';
import { ConsignorPerformance } from '../models/consignor-performance.model';
import { ExpiringConsignment } from '../models/expiring-consignment.model';
import { PointSales } from '../models/point-sales.model';
import { ReceptionDiscrepancyReport } from '../models/reception-discrepancies.model';
import { ReportFilters, toReportParams } from '../models/report-filters.model';
import { RotationReport } from '../models/rotation.model';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reports`;

  expiring(withinDays?: number, filters?: ReportFilters): Observable<ExpiringConsignment[]> {
    const params = toReportParams(filters);
    if (withinDays != null) params['withinDays'] = String(withinDays);
    return this.http.get<ExpiringConsignment[]>(`${this.base}/expiring`, { params });
  }

  byCategory(filters?: ReportFilters): Observable<CategorySales[]> {
    return this.http.get<CategorySales[]>(`${this.base}/by-category`, {
      params: toReportParams(filters),
    });
  }

  byPoint(filters?: ReportFilters): Observable<PointSales[]> {
    return this.http.get<PointSales[]>(`${this.base}/by-point`, {
      params: toReportParams(filters),
    });
  }

  rotation(filters?: ReportFilters): Observable<RotationReport> {
    return this.http.get<RotationReport>(`${this.base}/rotation`, {
      params: toReportParams(filters),
    });
  }

  consignors(filters?: ReportFilters): Observable<ConsignorPerformance[]> {
    return this.http.get<ConsignorPerformance[]>(`${this.base}/consignors`, {
      params: toReportParams(filters),
    });
  }

  discrepancies(filters?: ReportFilters): Observable<ReceptionDiscrepancyReport> {
    return this.http.get<ReceptionDiscrepancyReport>(`${this.base}/discrepancies`, {
      params: toReportParams(filters),
    });
  }
}
