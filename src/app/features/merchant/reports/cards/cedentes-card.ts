import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { ConsignorPerformance } from '../../../../core/models/consignor-performance.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { downloadCsv } from '../../../../shared/csv/to-csv';

type SortKey = 'ganancia' | 'rate';

const TOP = 5;

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ConsignorPerformance[] };

@Component({
  selector: 'app-cedentes-card',
  imports: [MoneyPipe, ErrorState, EmptyState],
  template: `
    <div id="rep-cedentes" class="t-card scroll-mt-24 p-6">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-title-3 text-trama-dark">
            {{ sort() === 'ganancia' ? '¿Quiénes me dan más ganancia?' : '¿Qué cedentes venden mejor lo que recibo?' }}
          </h2>
          <p class="mt-1 text-sm text-trama-muted">
            Ganancia del período; la tasa de venta muestra, de todo lo recibido, cuánto se vendió.
          </p>
        </div>
        @if (rows().length) {
          <button
            (click)="exportCsv()"
            class="shrink-0 t-btn t-btn-secondary t-btn-sm"
          >
            CSV
          </button>
        }
      </div>

      @if (isLoading()) {
        <div class="t-skeleton h-40" role="status" aria-label="Cargando"></div>
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar el reporte." (retry)="reload()" />
      } @else if (rows().length) {
        <div class="overflow-x-auto">
          <table class="t-table t-table-narrow">
            <thead>
              <tr>
                <th>Cedente</th>
                <th>Recibidas</th>
                <th>Vendidas</th>
                <th>
                  <button (click)="sortBy('rate')" [class]="thClass('rate')">Tasa de venta</button>
                </th>
                <th>
                  <button (click)="sortBy('ganancia')" [class]="thClass('ganancia')">Ganancia</button>
                </th>
                <th>Le debo</th>
              </tr>
            </thead>
            <tbody>
              @for (row of visible(); track row.consignorId) {
                <tr>
                  <td class="font-bold">{{ row.name }}</td>
                  <td class="text-trama-body">{{ row.receivedCount }}</td>
                  <td class="text-trama-body">{{ row.soldCount }}</td>
                  <td class="text-trama-body">
                    {{ row.sellThroughRate === null ? '—' : row.sellThroughRate + '%' }}
                  </td>
                  <td class="t-amount">{{ row.merchantProfit | money }}</td>
                  <td class="text-trama-body">{{ row.pendingAmount | money }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (rows().length > top) {
          <button (click)="toggle()" class="mt-3 text-sm font-semibold text-trama-brand">
            {{ showAll() ? 'Ver solo los ' + top : 'Ver todos (' + rows().length + ')' }}
          </button>
        }
      } @else {
        <app-empty-state message="No hay cedentes para este recorte." />
      }
    </div>
  `,
})
export class CedentesCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);

  protected readonly sort = signal<SortKey>('ganancia');

  private readonly filters$ = toObservable(this.filters.current);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([this.filters$, this.retry$]).pipe(
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

  protected readonly rows = computed(() => {
    const current = this.state();
    if (current.status !== 'loaded') return [];
    const key = this.sort();
    const value = (row: ConsignorPerformance): number =>
      key === 'ganancia' ? row.merchantProfit : (row.sellThroughRate ?? -1);
    return [...current.data].sort((a, b) => value(b) - value(a));
  });
  // The list grows with every consignor; show the top of the current sort, rest via CSV / toggle.
  protected readonly top = TOP;
  protected readonly showAll = signal(false);
  protected readonly visible = computed(() =>
    this.showAll() ? this.rows() : this.rows().slice(0, TOP),
  );

  protected toggle(): void {
    this.showAll.update((v) => !v);
  }

  protected exportCsv(): void {
    downloadCsv(
      'cedentes',
      ['Cedente', 'Recibidas', 'Vendidas', 'Tasa de venta %', 'Ganancia', 'Le debo'],
      this.rows().map((r) => [
        r.name,
        r.receivedCount,
        r.soldCount,
        r.sellThroughRate ?? '',
        r.merchantProfit,
        r.pendingAmount,
      ]),
    );
  }

  protected sortBy(key: SortKey): void {
    this.sort.set(key);
  }

  protected thClass(key: SortKey): string {
    return this.sort() === key ? 'font-semibold text-trama-brand' : 'hover:text-trama-dark';
  }

  protected reload(): void {
    this.retry$.next();
  }
}
