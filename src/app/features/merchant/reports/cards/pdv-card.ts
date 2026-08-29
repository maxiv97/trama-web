import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { PointSales } from '../../../../core/models/point-sales.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: PointSales[] };

@Component({
  selector: 'app-pdv-card',
  imports: [MoneyPipe, LoadingSpinner, ErrorState, EmptyState],
  template: `
    <div id="rep-pdv" class="scroll-mt-4 rounded-2xl border border-trama-sand-200 bg-white p-5">
      <div class="mb-4">
        <h2 class="font-display text-lg font-semibold text-trama-dark">
          ¿Cuánto gané por punto de venta?
        </h2>
        <p class="mt-1 text-sm text-trama-dark/50">Ganancia, ventas y ticket promedio del período.</p>
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
                <th class="py-2 pr-4 font-medium">Punto de venta</th>
                <th class="py-2 pr-4 font-medium">Ganancia</th>
                <th class="py-2 pr-4 font-medium">Ventas</th>
                <th class="py-2 font-medium">Ticket promedio</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.salesPointId) {
                <tr class="border-b border-trama-sand-100 last:border-0">
                  <td class="py-3 pr-4 font-medium text-trama-dark">{{ row.name }}</td>
                  <td class="py-3 pr-4 font-medium text-trama-green-700">{{ row.merchantProfit | money }}</td>
                  <td class="py-3 pr-4 text-trama-dark/70">{{ row.soldCount }}</td>
                  <td class="py-3 text-trama-dark/70">
                    {{ row.soldCount ? (row.revenue / row.soldCount | money) : '—' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <app-empty-state message="No hay ventas por punto de venta con este recorte." />
      }
    </div>
  `,
})
export class PdvCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);

  private readonly filters$ = toObservable(this.filters.current);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([this.filters$, this.retry$]).pipe(
      switchMap(([f]) =>
        this.reportsService.byPoint(f).pipe(
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
    return current.status === 'loaded' ? current.data : [];
  });

  protected reload(): void {
    this.retry$.next();
  }
}
