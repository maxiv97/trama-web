import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MonthlyPayout } from '../../../core/models/payout.model';
import { PaymentMethod } from '../../../core/models/sale.model';
import { MerchantsService } from '../../../core/services/merchants.service';
import { PayoutsService } from '../../../core/services/payouts.service';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { PayoutStatusBadge } from '../../../shared/components/payout-status-badge/payout-status-badge';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { monthLabel } from '../../../core/utils/month.util';
import { downloadPayoutPdf } from '../../../shared/pdf/payout-pdf';

interface PayoutsData {
  rows: MonthlyPayout[];
  merchantName: string;
}

type PayoutsState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: PayoutsData };

@Component({
  selector: 'app-merchant-payouts',
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
        <p class="text-trama-dark/70">No pudimos cargar las liquidaciones.</p>
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
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 class="text-2xl font-semibold text-trama-dark">Liquidaciones</h1>
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
        </div>

        @if (monthRows().length) {
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <app-stat-card title="Total a pagar" [value]="summary().total | money" />
            <app-stat-card title="Pendiente" [value]="summary().pending | money" />
            <app-stat-card title="Vencido" [value]="summary().overdue | money" color="red" />
            <app-stat-card title="Pagado" [value]="summary().paid | money" color="green" />
          </div>

          <p class="text-sm text-trama-dark/60">
            {{ summary().consignors }}
            {{ summary().consignors === 1 ? 'cedente' : 'cedentes' }} ·
            {{ summary().garments }}
            {{ summary().garments === 1 ? 'prenda vendida' : 'prendas vendidas' }}
          </p>

          @if (summary().overdueCount > 0) {
            <div class="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
              {{ summary().overdueCount }}
              {{ summary().overdueCount === 1 ? 'liquidación vencida' : 'liquidaciones vencidas' }}
              en este mes.
            </div>
          }

          <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Cedente</th>
                  <th class="px-4 py-3 font-medium">Prendas</th>
                  <th class="px-4 py-3 font-medium">Monto</th>
                  <th class="px-4 py-3 font-medium">Estado</th>
                  <th class="px-4 py-3 font-medium">Vencimiento</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (row of monthRows(); track row.key) {
                  <tr
                    class="border-b border-trama-sand-100 last:border-0"
                    [class.bg-red-50]="row.status === 'overdue'"
                  >
                    <td class="px-4 py-3">
                      <div class="font-medium text-trama-dark">{{ row.counterpartName }}</div>
                      @if (row.counterpartDni) {
                        <div class="text-trama-dark/50">DNI {{ row.counterpartDni }}</div>
                      }
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.lines.length }}</td>
                    <td class="px-4 py-3 font-medium text-trama-dark">{{ row.totalAmount | money }}</td>
                    <td class="px-4 py-3"><app-payout-status-badge [status]="row.status" /></td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.dueDate | shortDate }}</td>
                    <td class="px-4 py-3">
                      <div class="flex justify-end gap-2">
                        <button
                          type="button"
                          (click)="download(row)"
                          class="rounded-lg border border-trama-sand-200 px-3 py-1.5 text-xs font-medium text-trama-dark hover:bg-trama-sand-100"
                        >
                          Descargar
                        </button>
                        @if (row.status !== 'paid') {
                          <button
                            type="button"
                            (click)="openSettle(row)"
                            class="rounded-lg bg-trama-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-trama-green-700"
                          >
                            Marcar pagada
                          </button>
                        }
                      </div>
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
            No hay liquidaciones en este mes.
          </div>
        }
      </div>

      @if (settling(); as row) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          (click)="closeSettle()"
        >
          <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-semibold text-trama-dark">Marcar liquidación pagada</h2>
            <p class="mt-1 text-sm text-trama-dark/60">
              {{ row.counterpartName }} · {{ monthLabel(row.month) }} ·
              {{ row.pendingAmount | money }}
            </p>

            <div class="mt-4 space-y-4">
              <label class="block text-sm">
                <span class="text-trama-dark/70">Método de pago</span>
                <select
                  [value]="paymentMethod()"
                  (change)="paymentMethod.set($any($event.target).value)"
                  class="mt-1 w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                >
                  <option value="transfer">Transferencia</option>
                  <option value="cash">Efectivo</option>
                </select>
              </label>
              <label class="block text-sm">
                <span class="text-trama-dark/70">Nº de comprobante</span>
                <input
                  [value]="receiptNumber()"
                  (input)="receiptNumber.set($any($event.target).value)"
                  placeholder="Opcional"
                  class="mt-1 w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm outline-none focus:border-trama-brand"
                />
              </label>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                type="button"
                (click)="closeSettle()"
                [disabled]="acting()"
                class="rounded-lg px-4 py-2 text-sm font-medium text-trama-dark/70 hover:bg-trama-sand-100 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmSettle()"
                [disabled]="acting()"
                class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700 disabled:opacity-40"
              >
                {{ acting() ? 'Registrando…' : 'Registrar pago' }}
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class MerchantPayouts {
  private readonly auth = inject(AuthService);
  private readonly payoutsService = inject(PayoutsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly toast = inject(ToastService);

  protected readonly monthLabel = monthLabel;

  protected readonly selectedMonth = signal('');
  protected readonly settling = signal<MonthlyPayout | null>(null);
  protected readonly paymentMethod = signal<PaymentMethod>('transfer');
  protected readonly receiptNumber = signal('');
  protected readonly acting = signal(false);

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

  protected readonly months = computed(() => {
    const rows = this.data()?.rows ?? [];
    return [...new Set(rows.map((row) => row.month))].sort((a, b) => b.localeCompare(a));
  });

  protected readonly activeMonth = computed(() => this.selectedMonth() || this.months()[0] || '');

  protected readonly monthRows = computed(() => {
    const month = this.activeMonth();
    return (this.data()?.rows ?? []).filter((row) => row.month === month);
  });

  protected readonly summary = computed(() => {
    const rows = this.monthRows();
    return {
      total: rows.reduce((sum, row) => sum + row.totalAmount, 0),
      pending: rows
        .filter((row) => row.status === 'pending')
        .reduce((sum, row) => sum + row.pendingAmount, 0),
      overdue: rows
        .filter((row) => row.status === 'overdue')
        .reduce((sum, row) => sum + row.pendingAmount, 0),
      paid: rows.reduce((sum, row) => sum + row.paidAmount, 0),
      consignors: rows.length,
      garments: rows.reduce((sum, row) => sum + row.lines.length, 0),
      overdueCount: rows.filter((row) => row.status === 'overdue').length,
    };
  });

  protected retry(): void {
    this.reload.next();
  }

  protected openSettle(row: MonthlyPayout): void {
    this.paymentMethod.set('transfer');
    this.receiptNumber.set('');
    this.settling.set(row);
  }

  protected closeSettle(): void {
    if (this.acting()) return;
    this.settling.set(null);
  }

  protected confirmSettle(): void {
    const row = this.settling();
    if (!row || this.acting()) return;
    const receipt = this.receiptNumber().trim();

    this.acting.set(true);
    this.payoutsService
      .settleMonthly(row.unpaidGarmentIds, {
        paymentMethod: this.paymentMethod(),
        receiptNumber: receipt || undefined,
      })
      .subscribe({
        next: () => {
          this.acting.set(false);
          this.settling.set(null);
          this.toast.show('Liquidación registrada');
          this.reload.next();
        },
        error: () => {
          this.acting.set(false);
          this.toast.show('No pudimos registrar la liquidación', 'error');
        },
      });
  }

  protected download(row: MonthlyPayout): void {
    downloadPayoutPdf(row, {
      merchantName: this.data()?.merchantName ?? '',
      consignorName: row.counterpartName,
    });
  }

  private load(): Observable<PayoutsData> {
    const merchantId = this.auth.user()?.id ?? '';
    return forkJoin({
      rows: this.payoutsService.monthlyByMerchant(merchantId),
      merchant: this.merchantsService.getById(merchantId),
    }).pipe(
      map(
        ({ rows, merchant }): PayoutsData => ({
          rows,
          merchantName: merchant?.businessName ?? merchant?.name ?? '',
        }),
      ),
    );
  }
}
