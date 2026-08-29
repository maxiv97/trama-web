import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { CategorySales } from '../../../../core/models/category-sales.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { downloadCsv } from '../../../../shared/csv/to-csv';

type SortKey = 'ganancia' | 'conversion' | 'dias';

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: CategorySales[] };

@Component({
  selector: 'app-conviene-card',
  imports: [MoneyPipe, LoadingSpinner, ErrorState, EmptyState],
  template: `
    <div
      id="rep-conviene"
      class="scroll-mt-4 rounded-2xl border border-trama-sand-200 bg-white p-5"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="font-display text-lg font-semibold text-trama-dark">¿Qué me conviene recibir?</h2>
          <p class="mt-1 text-sm text-trama-dark/50">
            Ganancia, conversión y días a venta del período filtrado; stock a hoy.
          </p>
        </div>
        @if (rows().length) {
          <button (click)="exportCsv()" [class]="csvBtn">CSV</button>
        }
      </div>

      @if (isLoading()) {
        <app-loading-spinner />
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar el reporte." (retry)="reload()" />
      } @else if (rows().length) {
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-trama-sand-200 text-trama-dark/60">
              <tr>
                <th class="py-2 pr-4 font-medium">Categoría</th>
                <th class="py-2 pr-4 font-medium">
                  <button (click)="sortBy('ganancia')" [class]="thClass('ganancia')">Ganancia</button>
                </th>
                <th class="py-2 pr-4 font-medium">
                  <button (click)="sortBy('conversion')" [class]="thClass('conversion')">Conversión</button>
                </th>
                <th class="py-2 pr-4 font-medium">
                  <button (click)="sortBy('dias')" [class]="thClass('dias')">Días a venta</button>
                </th>
                <th class="py-2 font-medium">En stock</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.category) {
                <tr class="border-b border-trama-sand-100 last:border-0">
                  <td class="py-3 pr-4 font-medium text-trama-dark">{{ row.category }}</td>
                  <td class="py-3 pr-4 font-medium text-trama-green-700">{{ row.merchantProfit | money }}</td>
                  <td class="py-3 pr-4 text-trama-dark/70">
                    {{ row.conversion === null ? '—' : row.conversion + '%' }}
                  </td>
                  <td class="py-3 pr-4 text-trama-dark/70">
                    {{ row.avgDaysToSale === null ? '—' : row.avgDaysToSale + ' días' }}
                  </td>
                  <td class="py-3 text-trama-dark/70">{{ row.inStockCount }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <app-empty-state message="No hay datos para este recorte." />
      }
    </div>
  `,
})
export class ConvieneCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);

  protected readonly sort = signal<SortKey>('ganancia');

  private readonly filters$ = toObservable(this.filters.current);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([this.filters$, this.retry$]).pipe(
      switchMap(([f]) =>
        this.reportsService.byCategory(f).pipe(
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
    const value = (row: CategorySales): number =>
      key === 'ganancia'
        ? row.merchantProfit
        : key === 'conversion'
          ? (row.conversion ?? -1)
          : (row.avgDaysToSale ?? -1);
    return [...current.data].sort((a, b) => value(b) - value(a));
  });

  protected readonly csvBtn =
    'shrink-0 rounded-lg border border-trama-sand-200 px-3 py-1.5 text-xs font-semibold text-trama-dark/70 hover:bg-trama-sand-50';

  protected exportCsv(): void {
    downloadCsv(
      'conviene-recibir',
      ['Categoría', 'Ganancia', 'Conversión %', 'Días a venta', 'En stock'],
      this.rows().map((r) => [
        r.category,
        r.merchantProfit,
        r.conversion ?? '',
        r.avgDaysToSale ?? '',
        r.inStockCount,
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
