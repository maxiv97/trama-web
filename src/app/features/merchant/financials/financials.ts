import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap } from 'rxjs';
import { CategorySales } from '../../../core/models/category-sales.model';
import { ReportsService } from '../../../core/services/reports.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

interface FinancialsSummary {
  totalProfit: number;
  totalRevenue: number;
  totalSold: number;
  totalStock: number;
  avgTicket: number;
  maxProfit: number;
}

type FinancialsState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: CategorySales[] };

@Component({
  selector: 'app-financials',
  imports: [StatCard, MoneyPipe, LoadingSpinner, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar el panel financiero." (retry)="retry()" />
    } @else if (data(); as rows) {
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl font-semibold text-trama-dark">Financiera</h1>
          <p class="mt-1 text-sm text-trama-dark/50">
            Cuánto deja el negocio y qué categorías rinden más.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <app-stat-card title="Ganancia total" [value]="summary().totalProfit | money" color="green" />
          <app-stat-card title="Ticket promedio" [value]="summary().avgTicket | money" />
          <app-stat-card title="Prendas vendidas" [value]="summary().totalSold" />
          <app-stat-card title="En stock" [value]="summary().totalStock" />
        </div>

        @if (rows.length) {
          <section class="space-y-3">
            <h2 class="text-sm font-medium text-trama-dark/60">Ganancia por categoría</h2>
            <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                  <tr>
                    <th class="px-4 py-3 font-medium">Categoría</th>
                    <th class="px-4 py-3 font-medium">Vendidas</th>
                    <th class="px-4 py-3 font-medium">Ingreso</th>
                    <th class="px-4 py-3 font-medium">Ganancia</th>
                    <th class="px-4 py-3 font-medium">Ticket prom.</th>
                    <th class="px-4 py-3 font-medium">En stock</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of rows; track row.category) {
                    <tr class="border-b border-trama-sand-100 last:border-0">
                      <td class="px-4 py-3 font-medium text-trama-dark">{{ row.category }}</td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ row.soldCount }}</td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ row.soldRevenue | money }}</td>
                      <td class="min-w-40 px-4 py-3">
                        <span class="font-medium text-trama-dark">{{ row.merchantProfit | money }}</span>
                        <span class="mt-1 block h-1.5 rounded-full bg-trama-sand-100">
                          <span
                            class="block h-1.5 rounded-full bg-trama-brand"
                            [style.width.%]="barWidth(row)"
                          ></span>
                        </span>
                      </td>
                      <td class="px-4 py-3 text-trama-dark/70">
                        {{ row.soldCount ? (row.soldRevenue / row.soldCount | money) : '—' }}
                      </td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ row.inStockCount }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        } @else {
          <app-empty-state message="Todavía no hay ventas ni stock para reportar." />
        }
      </div>
    }
  `,
})
export class Financials {
  private readonly reportsService = inject(ReportsService);

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.reportsService.byCategory().pipe(
          map((data): FinancialsState => ({ status: 'loaded', data })),
          startWith<FinancialsState>({ status: 'loading', data: null }),
          catchError((): Observable<FinancialsState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as FinancialsState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly summary = computed<FinancialsSummary>(() => {
    const rows = this.data() ?? [];
    const totalProfit = rows.reduce((sum, row) => sum + row.merchantProfit, 0);
    const totalRevenue = rows.reduce((sum, row) => sum + row.soldRevenue, 0);
    const totalSold = rows.reduce((sum, row) => sum + row.soldCount, 0);
    const totalStock = rows.reduce((sum, row) => sum + row.inStockCount, 0);
    return {
      totalProfit,
      totalRevenue,
      totalSold,
      totalStock,
      avgTicket: totalSold ? Math.round(totalRevenue / totalSold) : 0,
      maxProfit: rows.reduce((max, row) => Math.max(max, row.merchantProfit), 0),
    };
  });

  protected retry(): void {
    this.reload.next();
  }

  protected barWidth(row: CategorySales): number {
    const max = this.summary().maxProfit;
    return max > 0 ? Math.round((row.merchantProfit / max) * 100) : 0;
  }
}
