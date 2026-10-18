import { Receipt, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { Component, computed, inject, signal, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MonthlyPayout } from '../../../core/models/payout.model';
import { PaymentMethod } from '../../../core/models/sale.model';
import { MerchantsService } from '../../../core/services/merchants.service';
import { PayoutsService } from '../../../core/services/payouts.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { PayoutStatusBadge } from '../../../shared/components/payout-status-badge/payout-status-badge';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { monthLabel } from '../../../core/utils/month.util';
import { downloadPayoutPdf } from '../../../shared/pdf/payout-pdf';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { ChipOption, DataTable, pageOf } from '../../../shared/components/data-table/data-table';
import { Dropdown, DropdownOption } from '../../../shared/components/dropdown/dropdown';
import { Avatar } from '../../../shared/components/avatar/avatar';

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
  imports: [Avatar, LucideAngularModule, Dropdown, DataTable, PageSkeleton, PageHeader, StatCard, PayoutStatusBadge, MoneyPipe, ShortDatePipe, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="table" />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar las liquidaciones." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <app-page-header title="Liquidaciones" section="Liquidaciones" [icon]="headerIcon" lead="Lo que le debés a cada cedente por las prendas vendidas, mes a mes.">
          @if (months().length) {
            <app-dropdown actions class="w-52" [onPage]="true" [alignRight]="true" ariaLabel="Mes" [options]="monthOptions()" [value]="activeMonth()" (valueChange)="selectedMonth.set($event)" />
          }
        </app-page-header>

        @if (monthRows().length) {
          <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <app-stat-card title="Total a pagar" [value]="summary().total | money" [highlight]="true" />
            <app-stat-card title="Pendiente" [value]="summary().pending | money" />
            <app-stat-card title="Vencido" [value]="summary().overdue | money" [color]="summary().overdue ? 'red' : 'default'" />
            <app-stat-card title="Pagado" [value]="summary().paid | money" />
          </div>

          @if (summary().overdueCount > 0) {
            <div class="t-alert">
              <strong>{{ summary().overdueCount }} {{ summary().overdueCount === 1 ? 'liquidación vencida' : 'liquidaciones vencidas' }} en este mes.</strong>
              Pagalas cuanto antes: el cedente ya lo ve como atrasado.
            </div>
          }

          <app-data-table [total]="monthRows().length" [shown]="monthRows().length" noun="liquidaciones" [showFooter]="true">
            <p toolbar class="text-sm text-trama-body">
              {{ summary().consignors }} {{ summary().consignors === 1 ? 'cedente' : 'cedentes' }} ·
              {{ summary().garments }} {{ summary().garments === 1 ? 'prenda vendida' : 'prendas vendidas' }}
            </p>
            <table class="t-table">
              <thead>
                <tr>
                  <th>Cedente</th>
                  <th class="t-num">Prendas</th>
                  <th class="t-num">Monto</th>
                  <th>Estado</th>
                  <th>Vencimiento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of monthRows(); track row.key) {
                  <tr>
                    <td class="t-cell-main">
                      <div class="flex items-center gap-3">
                        <app-avatar [name]="row.counterpartName" [size]="38" />
                        <span class="min-w-0">
                          <span class="block truncate font-bold">{{ row.counterpartName }}</span>
                          @if (row.counterpartDni) {
                            <span class="t-meta">DNI {{ row.counterpartDni }}</span>
                          }
                        </span>
                      </div>
                    </td>
                    <td data-label="Prendas" class="t-num t-amount">{{ row.lines.length }}</td>
                    <td data-label="Monto" class="t-num t-amount">{{ row.totalAmount | money }}</td>
                    <td data-label="Estado"><app-payout-status-badge [status]="row.status" /></td>
                    <td data-label="Vencimiento" class="whitespace-nowrap" [class]="row.status === 'overdue' ? 'font-bold text-status-none' : 't-muted'">{{ row.dueDate | shortDate }}</td>
                    <td class="t-cell-action">
                      <div class="flex justify-end gap-2">
                        <button type="button" (click)="download(row)" class="t-btn t-btn-secondary t-btn-sm">Descargar</button>
                        @if (row.status !== 'paid') {
                          <button type="button" (click)="openSettle(row)" class="t-btn t-btn-primary t-btn-sm">Marcar pagada</button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </app-data-table>
        } @else {
          <app-empty-state [icon]="headerIcon" title="No hay liquidaciones en este mes" message="Cuando vendas prendas consignadas, acá vas a ver cuánto le debés a cada cedente." />
        }
      </div>

      @if (settling(); as row) {
        <div class="t-overlay" (click)="closeSettle()">
          <div class="t-modal t-pop-in w-full max-w-md" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
            <h2 class="text-title-2 text-trama-dark">Marcar liquidación pagada</h2>
            <p class="mt-1.5 text-[15px] text-trama-body">
              {{ row.counterpartName }} · {{ monthLabel(row.month) }} ·
              <strong class="font-display font-bold text-trama-dark">{{ row.pendingAmount | money }}</strong>
            </p>

            <div class="mt-5 space-y-4">
              <div>
                <span class="t-label">Método de pago</span>
                <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Método de pago">
                  <button type="button" role="radio" class="t-chip" [attr.aria-checked]="paymentMethod() === 'transfer'" (click)="paymentMethod.set('transfer')">Transferencia</button>
                  <button type="button" role="radio" class="t-chip" [attr.aria-checked]="paymentMethod() === 'cash'" (click)="paymentMethod.set('cash')">Efectivo</button>
                </div>
              </div>
              <label class="block">
                <span class="t-label">Nº de comprobante</span>
                <input
                  [value]="receiptNumber()"
                  (input)="receiptNumber.set($any($event.target).value)"
                  placeholder="Opcional"
                  class="t-input"
                />
              </label>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                type="button"
                (click)="closeSettle()"
                [disabled]="acting()"
                class="t-btn t-btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmSettle()"
                [disabled]="acting()"
                class="t-btn t-btn-primary"
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
  protected readonly chevIcon = ChevronRight;
  protected readonly monthOptions = computed<DropdownOption[]>(() =>
    this.months().map((m) => ({ value: m, label: this.monthLabel(m) })),
  );
  protected readonly headerIcon = Receipt;
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
