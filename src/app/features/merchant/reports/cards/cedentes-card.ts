import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { ConsignorPerformance } from '../../../../core/models/consignor-performance.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

type SortKey = 'ganancia' | 'rate';

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ConsignorPerformance[] };

@Component({
  selector: 'app-cedentes-card',
  imports: [MoneyPipe, LoadingSpinner, ErrorState, EmptyState],
  template: `
    <div id="rep-cedentes" class="scroll-mt-4 rounded-2xl border border-trama-sand-200 bg-white p-5">
      <div class="mb-4">
        <h2 class="font-display text-lg font-semibold text-trama-dark">
          {{ sort() === 'ganancia' ? '¿Quiénes me dan más ganancia?' : '¿Qué cedentes venden mejor lo que recibo?' }}
        </h2>
        <p class="mt-1 text-sm text-trama-dark/50">
          Ganancia del período; la tasa de venta muestra, de todo lo recibido, cuánto se vendió.
        </p>
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
                <th class="py-2 pr-4 font-medium">Cedente</th>
                <th class="py-2 pr-4 font-medium">Recibidas</th>
                <th class="py-2 pr-4 font-medium">Vendidas</th>
                <th class="py-2 pr-4 font-medium">
                  <button (click)="sortBy('rate')" [class]="thClass('rate')">Tasa de venta</button>
                </th>
                <th class="py-2 pr-4 font-medium">
                  <button (click)="sortBy('ganancia')" [class]="thClass('ganancia')">Ganancia</button>
                </th>
                <th class="py-2 font-medium">Le debo</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.consignorId) {
                <tr class="border-b border-trama-sand-100 last:border-0">
                  <td class="py-3 pr-4 font-medium text-trama-dark">{{ row.name }}</td>
                  <td class="py-3 pr-4 text-trama-dark/70">{{ row.receivedCount }}</td>
                  <td class="py-3 pr-4 text-trama-dark/70">{{ row.soldCount }}</td>
                  <td class="py-3 pr-4 text-trama-dark/70">
                    {{ row.sellThroughRate === null ? '—' : row.sellThroughRate + '%' }}
                  </td>
                  <td class="py-3 pr-4 font-medium text-trama-green-700">{{ row.merchantProfit | money }}</td>
                  <td class="py-3 text-trama-dark/70">{{ row.pendingAmount | money }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
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
