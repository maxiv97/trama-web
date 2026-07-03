import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Garment } from '../models/garment.model';
import { transition } from '../state-machine/garment.state-machine';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

export type NewGarment = Omit<Garment, 'id' | 'status' | 'createdAt' | 'timeline'>;

@Injectable({ providedIn: 'root' })
export class GarmentsService {
  private readonly store = inject(MockStore);

  list(): Observable<Garment[]> {
    return mockResponse(this.store.data.garments);
  }

  create(input: NewGarment): Observable<Garment> {
    const createdAt = new Date();
    const status = transition('submitted', 'SUBMIT_PROPOSAL');
    const garment: Garment = {
      ...input,
      id: `gar-${Date.now()}`,
      status,
      createdAt,
      timeline: [
        { date: createdAt, actor: 'consignor', status: 'submitted' },
        { date: createdAt, actor: 'consignor', status, note: 'Propuesta enviada' },
      ],
    };
    this.store.data.garments.push(garment);
    this.store.persist();
    return mockResponse(garment);
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
