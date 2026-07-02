import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Payout } from '../models/payout.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class PayoutsService {
  private readonly store = inject(MockStore);

  getById(id: string): Observable<Payout | undefined> {
    return mockResponse(this.store.data.payouts.find((payout) => payout.id === id));
  }

  byConsignor(consignorId: string): Observable<Payout[]> {
    return mockResponse(
      this.store.data.payouts.filter((payout) => payout.consignorId === consignorId),
    );
  }

  byMerchant(merchantId: string): Observable<Payout[]> {
    return mockResponse(this.store.data.payouts.filter((payout) => payout.merchantId === merchantId));
  }
}
