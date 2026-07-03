import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Merchant } from '../models/user.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class MerchantsService {
  private readonly store = inject(MockStore);

  list(): Observable<Merchant[]> {
    return mockResponse(this.store.data.merchants);
  }

  getById(id: string): Observable<Merchant | undefined> {
    return mockResponse(this.store.data.merchants.find((merchant) => merchant.id === id));
  }
}
