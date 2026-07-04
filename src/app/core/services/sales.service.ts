import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Sale } from '../models/sale.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly store = inject(MockStore);

  byGarment(garmentId: string): Observable<Sale | undefined> {
    return mockResponse(this.store.data.sales.find((sale) => sale.garmentId === garmentId));
  }

  create(sale: Sale): Observable<Sale> {
    this.store.data.sales.push(sale);
    this.store.persist();
    return mockResponse(sale);
  }
}
