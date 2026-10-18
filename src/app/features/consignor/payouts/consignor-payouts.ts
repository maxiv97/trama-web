import { Receipt, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { Component, computed, inject, signal, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MonthlyPayout } from '../../../core/models/payout.model';
import { PayoutsService } from '../../../core/services/payouts.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { PayoutStatusBadge } from '../../../shared/components/payout-status-badge/payout-status-badge';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { monthLabel } from '../../../core/utils/month.util';
import { downloadPayoutPdf } from '../../../shared/pdf/payout-pdf';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { ChipOption, DataTable, pageOf, PersonCell } from '../../../shared/components/data-table/data-table';
import { Dropdown, DropdownOption } from '../../../shared/components/dropdown/dropdown';

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
  imports: [LucideAngularModule, Dropdown, PersonCell, DataTable, PageSkeleton, PageHeader, StatCard, PayoutStatusBadge, MoneyPipe, ShortDatePipe, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="table" />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar tus liquidaciones." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <app-page-header title="Mis liquidaciones" section="Liquidaciones" [icon]="headerIcon" lead="Lo que cobraste y lo que te deben los comercios por tus prendas vendidas.">
          @if (months().length) {
            <app-dropdown actions class="w-52" [onPage]="true" [alignRight]="true" ariaLabel="Mes" [options]="monthOptions()" [value]="activeMonth()" (valueChange)="selectedMonth.set($event)" />
          }
        </app-page-header>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <app-stat-card title="A cobrar pendiente" [value]="pendingTotal() | money" [highlight]="true" />
          <app-stat-card title="Cobrado histórico" [value]="paidTotal() | money" />
        </div>

        @if (monthRows().length) {
          <app-data-table [total]="monthRows().length" [shown]="monthRows().length" noun="liquidaciones">
            <table class="t-table t-table-narrow">
              <thead>
                <tr>
                  <th>Comercio</th>
                  <th class="t-num">Prendas</th>
                  <th class="t-num">Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of monthRows(); track row.key) {
                  <tr>
                    <td class="t-cell-main"><app-person-cell kind="merchant" [name]="row.counterpartName" /></td>
                    <td data-label="Prendas" class="t-num t-amount">{{ row.lines.length }}</td>
                    <td data-label="Monto" class="t-num t-amount">{{ row.totalAmount | money }}</td>
                    <td data-label="Estado"><app-payout-status-badge [status]="row.status" /></td>
                    <td data-label="Fecha" class="t-muted whitespace-nowrap">
                      {{ (row.status === 'paid' ? row.paidAt : row.dueDate) | shortDate }}
                    </td>
                    <td class="t-cell-action text-right">
                      <button type="button" (click)="download(row)" class="t-btn t-btn-secondary t-btn-sm">Descargar</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </app-data-table>
          <p class="text-[13px] text-trama-muted">
            Este detalle es informativo y no tiene validez como comprobante fiscal.
          </p>
        } @else {
          <app-empty-state [icon]="headerIcon" title="No tenés ventas en este mes" message="Cuando un comercio venda una de tus prendas, acá vas a ver cuánto te corresponde y cuándo te pagan." />
        }
      </div>
    }
  `,
})
export class ConsignorPayouts {
  protected readonly chevIcon = ChevronRight;
  protected readonly monthOptions = computed<DropdownOption[]>(() =>
    this.months().map((m) => ({ value: m, label: this.monthLabel(m) })),
  );
  protected readonly headerIcon = Receipt;
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
