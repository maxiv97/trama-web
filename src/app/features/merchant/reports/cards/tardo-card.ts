import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { ConsignorPerformance } from '../../../../core/models/consignor-performance.model';
import { ReportFilters } from '../../../../core/models/report-filters.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { downloadCsv } from '../../../../shared/csv/to-csv';

const TOP = 5;
const SMALL_SAMPLE = 2;

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ConsignorPerformance[] };

@Component({
  selector: 'app-tardo-card',
  imports: [LoadingSpinner, ErrorState, EmptyState],
  template: `
    <div id="rep-tardo" class="t-card scroll-mt-4 p-5">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="font-display text-lg font-semibold text-trama-dark">¿Cuánto tardo en liquidar?</h2>
          <p class="mt-1 text-sm text-trama-dark/50">
            Días promedio entre la venta y el pago al cedente · histórico, no depende del período.
          </p>
        </div>
        @if (ranked().length) {
          <button
            (click)="exportCsv()"
            class="shrink-0 t-btn t-btn-secondary t-btn-sm"
          >
            CSV
          </button>
        }
      </div>

      @if (isLoading()) {
        <app-loading-spinner />
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar el reporte." (retry)="reload()" />
      } @else if (ranked().length) {
        <div class="mb-4 flex items-baseline justify-between rounded-xl bg-trama-sand-50 px-4 py-3">
          <span class="text-sm text-trama-dark/60">Promedio general</span>
          <span class="font-display text-2xl font-semibold text-trama-dark">{{ avg() }} días</span>
        </div>

        <div class="divide-y divide-trama-sand-100">
          @for (row of visible(); track row.consignorId) {
            <div class="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm">
              <span class="font-medium text-trama-dark">{{ row.name }}</span>
              <div class="flex items-center gap-3 justify-self-end">
                <span class="font-semibold text-trama-dark">{{ row.avgPayoutDays }} días</span>
                <span class="text-xs text-trama-dark/50">{{ liqsLabel(row.paidCount) }}</span>
                @if (row.paidCount < smallSample) {
                  <span class="rounded-full bg-trama-gold/15 px-2 py-0.5 text-xs font-semibold text-trama-gold">
                    muestra chica
                  </span>
                }
              </div>
            </div>
          }
        </div>

        @if (ranked().length > top) {
          <button (click)="toggle()" class="mt-3 text-sm font-semibold text-trama-brand">
            {{ showAll() ? 'Ver solo los ' + top + ' más lentos' : 'Ver todos (' + ranked().length + ')' }}
          </button>
        }
        @if (hasSmallSample()) {
          <p class="mt-4 border-t border-trama-sand-100 pt-3 text-xs text-trama-dark/50">
            <b class="font-semibold text-trama-dark/70">Muestra chica:</b> cedentes con menos de
            {{ smallSample }} liquidaciones pagadas — el promedio todavía no es representativo.
          </p>
        }
      } @else {
        <app-empty-state
          message="Todavía no registraste pagos. Cuando liquides vas a ver acá a quién le tardás más."
        />
      }
    </div>
  `,
})
export class TardoCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);

  protected readonly top = TOP;
  protected readonly smallSample = SMALL_SAMPLE;
  protected readonly showAll = signal(false);

  // Track record: only the dimensions apply; the period is ignored on purpose.
  private readonly dimensions = computed<ReportFilters>(() => ({
    salesPointId: this.filters.salesPointId(),
    category: this.filters.category(),
    consignorId: this.filters.consignorId(),
  }));

  private readonly dimensions$ = toObservable(this.dimensions);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([this.dimensions$, this.retry$]).pipe(
      switchMap(([f]) =>
        this.reportsService.consignors(f).pipe(
          map((data): State => ({ status: 'loaded', data })),
          startWith<State>({ status: 'loading', data: null }),
          catchError((): Observable<State> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as State },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');

  protected readonly ranked = computed(() => {
    const current = this.state();
    if (current.status !== 'loaded') return [];
    return current.data
      .filter((row) => row.avgPayoutDays !== null && row.paidCount > 0)
      .sort((a, b) => (b.avgPayoutDays ?? 0) - (a.avgPayoutDays ?? 0));
  });

  protected readonly visible = computed(() =>
    this.showAll() ? this.ranked() : this.ranked().slice(0, TOP),
  );
  protected readonly hasSmallSample = computed(() =>
    this.visible().some((r) => r.paidCount < SMALL_SAMPLE),
  );

  // Weighted average over all paid liquidations, not an average of per-consignor averages.
  protected readonly avg = computed(() => {
    const rows = this.ranked();
    const paid = rows.reduce((sum, r) => sum + r.paidCount, 0);
    if (!paid) return 0;
    const days = rows.reduce((sum, r) => sum + (r.avgPayoutDays ?? 0) * r.paidCount, 0);
    return Math.round(days / paid);
  });

  protected liqsLabel(count: number): string {
    return `${count} ${count === 1 ? 'liquidación pagada' : 'liquidaciones pagadas'}`;
  }

  protected exportCsv(): void {
    downloadCsv(
      'tiempo-de-liquidacion',
      ['Cedente', 'Días promedio', 'Liquidaciones pagadas'],
      this.ranked().map((r) => [r.name, r.avgPayoutDays ?? '', r.paidCount]),
    );
  }

  protected toggle(): void {
    this.showAll.update((v) => !v);
  }

  protected reload(): void {
    this.retry$.next();
  }
}
