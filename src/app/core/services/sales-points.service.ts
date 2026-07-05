import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { SalesPoint } from '../models/sales-point.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class SalesPointsService {
  private readonly store = inject(MockStore);

  private all(): SalesPoint[] {
    return this.store.data.merchants.flatMap((merchant) => merchant.salesPoints);
  }

  list(): Observable<SalesPoint[]> {
    return mockResponse(this.all());
  }

  byMerchant(merchantId: string): Observable<SalesPoint[]> {
    const merchant = this.store.data.merchants.find((item) => item.id === merchantId);
    return mockResponse(merchant ? merchant.salesPoints : []);
  }

  getById(id: string): Observable<SalesPoint | undefined> {
    return mockResponse(this.all().find((salesPoint) => salesPoint.id === id));
  }

  create(point: SalesPoint): Observable<SalesPoint> {
    const merchant = this.store.data.merchants.find((item) => item.id === point.merchantId);
    if (!merchant) {
      return throwError(() => new Error(`Comercio no encontrado: ${point.merchantId}`));
    }
    merchant.salesPoints.push(point);
    this.store.persist();
    return mockResponse(point);
  }

  update(point: SalesPoint): Observable<SalesPoint> {
    const merchant = this.store.data.merchants.find((item) => item.id === point.merchantId);
    const index = merchant?.salesPoints.findIndex((item) => item.id === point.id) ?? -1;
    if (!merchant || index < 0) {
      return throwError(() => new Error(`Punto de venta no encontrado: ${point.id}`));
    }
    merchant.salesPoints[index] = point;
    this.store.persist();
    return mockResponse(point);
  }
}
