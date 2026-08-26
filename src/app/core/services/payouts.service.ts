import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MonthlyPayout, Payout } from '../models/payout.model';
import { ReportFilters, toReportParams } from '../models/report-filters.model';
import { PaymentMethod } from '../models/sale.model';

interface SettlePayment {
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class PayoutsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  byConsignor(_consignorId: string): Observable<Payout[]> {
    return this.http.get<Payout[]>(`${this.api}/payouts`);
  }

  byMerchant(_merchantId: string, filters?: ReportFilters): Observable<Payout[]> {
    return this.http.get<Payout[]>(`${this.api}/payouts`, { params: toReportParams(filters) });
  }

  monthlyByConsignor(_consignorId: string): Observable<MonthlyPayout[]> {
    return this.http.get<MonthlyPayout[]>(`${this.api}/payouts/monthly`);
  }

  monthlyByMerchant(_merchantId: string, filters?: ReportFilters): Observable<MonthlyPayout[]> {
    return this.http.get<MonthlyPayout[]>(`${this.api}/payouts/monthly`, {
      params: toReportParams(filters),
    });
  }

  settleMonthly(garmentIds: string[], payment: SettlePayment): Observable<unknown> {
    return this.http.post(`${this.api}/payouts/settle`, {
      garmentIds,
      paymentMethod: payment.paymentMethod,
      receiptNumber: payment.receiptNumber,
    });
  }
}
