import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import { MonthlyPayout, Payout } from '../models/payout.model';
import { PaymentMethod } from '../models/sale.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';
import { GarmentsService } from './garments.service';
import { SalesService } from './sales.service';

type Perspective = 'merchant' | 'consignor';

interface SettlePayment {
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable({ providedIn: 'root' })
export class PayoutsService {
  private readonly store = inject(MockStore);
  private readonly garmentsService = inject(GarmentsService);
  private readonly salesService = inject(SalesService);

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

  monthlyByMerchant(merchantId: string): Observable<MonthlyPayout[]> {
    return mockResponse(this.buildMonthly('merchant', merchantId));
  }

  monthlyByConsignor(consignorId: string): Observable<MonthlyPayout[]> {
    return mockResponse(this.buildMonthly('consignor', consignorId));
  }

  settleMonthly(garmentIds: string[], payment: SettlePayment): Observable<unknown> {
    if (!garmentIds.length) return of([]);
    const method = payment.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia';
    const note = `Pago: ${method} · Comp. ${payment.receiptNumber || '—'}`;
    return forkJoin(
      garmentIds.map((garmentId) =>
        this.garmentsService
          .applyAction(garmentId, 'MARK_PAID_OUT', 'merchant', note)
          .pipe(switchMap(() => this.salesService.markPaid(garmentId, payment))),
      ),
    );
  }

  private buildMonthly(perspective: Perspective, id: string): MonthlyPayout[] {
    const { sales, garments, merchants, consignors } = this.store.data;
    const garmentById = new Map(garments.map((garment) => [garment.id, garment]));
    const merchantById = new Map(merchants.map((merchant) => [merchant.id, merchant]));
    const consignorById = new Map(consignors.map((consignor) => [consignor.id, consignor]));
    const now = new Date();

    const groups = new Map<string, MonthlyPayout>();
    for (const sale of sales) {
      const garment = garmentById.get(sale.garmentId);
      if (!garment || !garment.merchantId) continue;
      if (perspective === 'merchant' && garment.merchantId !== id) continue;
      if (perspective === 'consignor' && garment.consignorId !== id) continue;

      const merchant = merchantById.get(garment.merchantId);
      const consignor = consignorById.get(garment.consignorId);
      const month = monthKey(sale.soldAt);
      const counterpartId = perspective === 'merchant' ? garment.consignorId : garment.merchantId;
      const key = `${counterpartId}-${month}`;

      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          month,
          counterpartId,
          counterpartName:
            perspective === 'merchant'
              ? (consignor?.name ?? '—')
              : (merchant?.businessName ?? '—'),
          counterpartDni: perspective === 'merchant' ? consignor?.dni : undefined,
          lines: [],
          unpaidGarmentIds: [],
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          status: 'pending',
          dueDate: this.dueDateFor(month, merchant?.terms.payoutDay ?? 20),
        };
        groups.set(key, group);
      }

      const paid = !!sale.paidAt;
      group.lines.push({
        garmentId: garment.id,
        garmentName: garment.name,
        soldAt: sale.soldAt,
        consignorAmount: sale.consignorAmount,
        paid,
      });
      group.totalAmount += sale.consignorAmount;
      if (paid) {
        group.paidAmount += sale.consignorAmount;
        if (sale.paidAt && (!group.paidAt || sale.paidAt > group.paidAt)) {
          group.paidAt = sale.paidAt;
        }
      } else {
        group.pendingAmount += sale.consignorAmount;
        group.unpaidGarmentIds.push(garment.id);
      }
    }

    const result = [...groups.values()];
    for (const group of result) {
      const allPaid = group.lines.every((line) => line.paid);
      group.status = allPaid ? 'paid' : group.dueDate < now ? 'overdue' : 'pending';
      group.lines.sort((a, b) => a.soldAt.getTime() - b.soldAt.getTime());
    }
    return result.sort(
      (a, b) => b.month.localeCompare(a.month) || a.counterpartName.localeCompare(b.counterpartName),
    );
  }

  private dueDateFor(month: string, payoutDay: number): Date {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(year, monthNumber, payoutDay);
  }
}
