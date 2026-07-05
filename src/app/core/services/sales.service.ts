import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { PaymentMethod, Sale } from '../models/sale.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly store = inject(MockStore);

  list(): Observable<Sale[]> {
    return mockResponse(this.store.data.sales);
  }

  byGarment(garmentId: string): Observable<Sale | undefined> {
    return mockResponse(this.store.data.sales.find((sale) => sale.garmentId === garmentId));
  }

  create(sale: Sale): Observable<Sale> {
    this.store.data.sales.push(sale);
    this.store.persist();
    return mockResponse(sale);
  }

  markPaid(
    garmentId: string,
    payment: { paymentMethod: PaymentMethod; receiptNumber?: string },
  ): Observable<Sale> {
    const sale = this.store.data.sales.find((item) => item.garmentId === garmentId);
    if (!sale) {
      return throwError(() => new Error(`Venta no encontrada para la prenda: ${garmentId}`));
    }
    sale.paidAt = new Date();
    sale.paymentMethod = payment.paymentMethod;
    sale.receiptNumber = payment.receiptNumber;
    this.store.persist();
    return mockResponse(sale);
  }
}
