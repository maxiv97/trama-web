import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MonthlyPayout } from '../../../core/models/payout.model';
import { PayoutsService } from '../../../core/services/payouts.service';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { PayoutStatusBadge } from '../../../shared/components/payout-status-badge/payout-status-badge';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { monthLabel } from '../../../core/utils/month.util';
import { downloadPayoutPdf } from '../../../shared/pdf/payout-pdf';

interface PayoutsData {
  rows: MonthlyPayout[];
  consignorName: string;
}

type PayoutsState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: PayoutsData };

@Component({
  selector: 'app-consignor-payouts',
  imports: [StatCard, PayoutStatusBadge, MoneyPipe, ShortDatePipe],
  template: `
    @if (isLoading()) {
      <div class="flex min-h-[60vh] items-center justify-center">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-trama-sand-200 border-t-trama-brand"
        ></div>
      </div>
    } @else if (isError()) {
      <div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p class="text-trama-dark/70">No pudimos cargar tus liquidaciones.</p>
        <button
          type="button"
          (click)="retry()"
          class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
        >
          Reintentar
        </button>
      </div>
    } @else if (data(); as d) {
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold text-trama-dark">Mis liquidaciones</h1>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <app-stat-card title="A cobrar pendiente" [value]="pendingTotal() | money" color="red" />
          <app-stat-card title="Cobrado histórico" [value]="paidTotal() | money" color="green" />
        </div>

        @if (months().length) {
          <select
            [value]="activeMonth()"
            (change)="selectedMonth.set($any($event.target).value)"
            class="rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
          >
            @for (month of months(); track month) {
              <option [value]="month" [selected]="activeMonth() === month">
                {{ monthLabel(month) }}
              </option>
            }
          </select>
        }

        @if (monthRows().length) {
          <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Comercio</th>
                  <th class="px-4 py-3 font-medium">Prendas</th>
                  <th class="px-4 py-3 font-medium">Monto</th>
                  <th class="px-4 py-3 font-medium">Estado</th>
                  <th class="px-4 py-3 font-medium">Fecha</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (row of monthRows(); track row.key) {
                  <tr class="border-b border-trama-sand-100 last:border-0">
                    <td class="px-4 py-3 font-medium text-trama-dark">{{ row.counterpartName }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.lines.length }}</td>
                    <td class="px-4 py-3 font-medium text-trama-dark">{{ row.totalAmount | money }}</td>
                    <td class="px-4 py-3"><app-payout-status-badge [status]="row.status" /></td>
                    <td class="px-4 py-3 text-trama-dark/70">
                      {{ (row.status === 'paid' ? row.paidAt : row.dueDate) | shortDate }}
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button
                        type="button"
                        (click)="download(row)"
                        class="rounded-lg border border-trama-sand-200 px-3 py-1.5 text-xs font-medium text-trama-dark hover:bg-trama-sand-100"
                      >
                        Descargar
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div
            class="rounded-2xl border border-dashed border-trama-sand-200 py-16 text-center text-trama-dark/60"
          >
            No tenés ventas en este mes.
          </div>
        }
      </div>
    }
  `,
})
export class ConsignorPayouts {
  private readonly auth = inject(AuthService);
  private readonly payoutsService = inject(PayoutsService);

  protected readonly monthLabel = monthLabel;

  protected readonly selectedMonth = signal('');

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): PayoutsState => ({ status: 'loaded', data })),
          startWith<PayoutsState>({ status: 'loading', data: null }),
          catchError((): Observable<PayoutsState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as PayoutsState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly pendingTotal = computed(() =>
    (this.data()?.rows ?? [])
      .filter((row) => row.status !== 'paid')
      .reduce((sum, row) => sum + row.pendingAmount, 0),
  );

  protected readonly paidTotal = computed(() =>
    (this.data()?.rows ?? []).reduce((sum, row) => sum + row.paidAmount, 0),
  );

  protected readonly months = computed(() => {
    const rows = this.data()?.rows ?? [];
    return [...new Set(rows.map((row) => row.month))].sort((a, b) => b.localeCompare(a));
  });

  protected readonly activeMonth = computed(() => this.selectedMonth() || this.months()[0] || '');

  protected readonly monthRows = computed(() => {
    const month = this.activeMonth();
    return (this.data()?.rows ?? []).filter((row) => row.month === month);
  });

  protected retry(): void {
    this.reload.next();
  }

  protected download(row: MonthlyPayout): void {
    downloadPayoutPdf(row, {
      merchantName: row.counterpartName,
      consignorName: this.data()?.consignorName ?? '',
    });
  }

  private load(): Observable<PayoutsData> {
    const user = this.auth.user();
    const consignorId = user?.id ?? '';
    return this.payoutsService
      .monthlyByConsignor(consignorId)
      .pipe(map((rows): PayoutsData => ({ rows, consignorName: user?.name ?? '' })));
  }
}
