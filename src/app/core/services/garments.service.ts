import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Garment } from '../models/garment.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class GarmentsService {
  private readonly store = inject(MockStore);

  list(): Observable<Garment[]> {
    return mockResponse(this.store.data.garments);
  }

  getById(id: string): Observable<Garment | undefined> {
    return mockResponse(this.store.data.garments.find((garment) => garment.id === id));
  }

  byConsignor(consignorId: string): Observable<Garment[]> {
    return mockResponse(
      this.store.data.garments.filter((garment) => garment.consignorId === consignorId),
    );
  }

  byMerchant(merchantId: string): Observable<Garment[]> {
    return mockResponse(
      this.store.data.garments.filter((garment) => garment.merchantId === merchantId),
    );
  }
}
