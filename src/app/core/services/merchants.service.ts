import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
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

  update(merchant: Merchant): Observable<Merchant> {
    const index = this.store.data.merchants.findIndex((item) => item.id === merchant.id);
    if (index < 0) {
      return throwError(() => new Error(`Comercio no encontrado: ${merchant.id}`));
    }
    this.store.data.merchants[index] = merchant;
    this.store.persist();
    return mockResponse(merchant);
  }
}
