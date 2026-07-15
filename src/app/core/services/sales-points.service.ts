import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SalesPoint } from '../models/sales-point.model';

@Injectable({ providedIn: 'root' })
export class SalesPointsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/sales-points`;

  list(): Observable<SalesPoint[]> {
    return this.http.get<SalesPoint[]>(this.base);
  }

  byMerchant(merchantId: string): Observable<SalesPoint[]> {
    return this.http.get<SalesPoint[]>(this.base, { params: { merchantId } });
  }

  getById(id: string): Observable<SalesPoint> {
    return this.http.get<SalesPoint>(`${this.base}/${id}`);
  }

  create(point: SalesPoint): Observable<SalesPoint> {
    return this.http.post<SalesPoint>(this.base, point);
  }

  update(point: SalesPoint): Observable<SalesPoint> {
    return this.http.patch<SalesPoint>(`${this.base}/${point.id}`, point);
  }
}
