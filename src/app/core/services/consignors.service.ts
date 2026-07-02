import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Consignor } from '../models/user.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class ConsignorsService {
  private readonly store = inject(MockStore);

  list(): Observable<Consignor[]> {
    return mockResponse(this.store.data.consignors);
  }

  getById(id: string): Observable<Consignor | undefined> {
    return mockResponse(this.store.data.consignors.find((consignor) => consignor.id === id));
  }

  byMerchant(merchantId: string): Observable<Consignor[]> {
    const consignorIds = new Set(
      this.store.data.garments
        .filter((garment) => garment.merchantId === merchantId)
        .map((garment) => garment.consignorId),
    );
    return mockResponse(
      this.store.data.consignors.filter((consignor) => consignorIds.has(consignor.id)),
    );
  }
}
