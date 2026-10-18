import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  firstValueFrom,
  forkJoin,
  map,
  Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { PointSales } from '../../../../core/models/point-sales.model';
import { ConsignorsService } from '../../../../core/services/consignors.service';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { GarmentsService } from '../../../../core/services/garments.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { SalesService } from '../../../../core/services/sales.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { downloadXlsx } from '../../../../shared/xlsx/to-xlsx';

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: PointSales[] };

@Component({
  selector: 'app-pdv-card',
  imports: [MoneyPipe, ErrorState, EmptyState],
  template: `
    <div id="rep-pdv" class="t-card scroll-mt-24 p-6">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-title-3 text-trama-dark">
            ¿Cuánto gané por punto de venta?
          </h2>
          <p class="mt-1 text-sm text-trama-muted">Ganancia, ventas y ticket promedio del período.</p>
        </div>
        @if (rows().length) {
          <button
            (click)="exportXlsx()"
            [disabled]="exporting()"
            class="shrink-0 t-btn t-btn-secondary t-btn-sm"
          >
            {{ exporting() ? 'Generando…' : 'Excel' }}
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
                <th>Punto de venta</th>
                <th>Ganancia</th>
                <th>Ventas</th>
                <th>Ticket promedio</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.salesPointId) {
                <tr>
                  <td class="font-bold">{{ row.name }}</td>
                  <td class="t-amount">{{ row.merchantProfit | money }}</td>
                  <td class="text-trama-body">{{ row.soldCount }}</td>
                  <td class="text-trama-body">
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
  private readonly salesService = inject(SalesService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly consignorsService = inject(ConsignorsService);

  protected readonly exporting = signal(false);

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

  // Excel with a summary tab plus a per-garment detail of the sales in the current recorte,
  // composed from the raw sales + garments (the aggregate report doesn't carry that detail).
  protected async exportXlsx(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const f = this.filters.current();
      const [sales, garments, consignors] = await firstValueFrom(
        forkJoin([this.salesService.list(), this.garmentsService.list(), this.consignorsService.list()]),
      );
      const garmentById = new Map(garments.map((g) => [g.id, g]));
      const consignorName = new Map(consignors.map((c) => [c.id, c.name]));
      const pointName = new Map(this.rows().map((r) => [r.salesPointId, r.name]));
      const from = f.from ? new Date(`${f.from}T00:00:00.000Z`) : null;
      const to = f.to ? new Date(`${f.to}T23:59:59.999Z`) : null;

      const detail: (string | number | null)[][] = [];
      let totalRevenue = 0;
      let totalProfit = 0;
      for (const sale of sales) {
        const g = garmentById.get(sale.garmentId);
        if (!g) continue;
        if (f.salesPointId && g.salesPointId !== f.salesPointId) continue;
        if (f.category && g.category !== f.category) continue;
        if (f.consignorId && g.consignorId !== f.consignorId) continue;
        const soldAt = new Date(sale.soldAt);
        if (from && soldAt < from) continue;
        if (to && soldAt > to) continue;
        detail.push([
          pointName.get(g.salesPointId ?? '') ?? '—',
          g.name,
          g.category,
          consignorName.get(g.consignorId) ?? '—',
          sale.actualSalePrice,
          sale.merchantCommission,
          soldAt.toISOString().slice(0, 10),
        ]);
        totalRevenue += sale.actualSalePrice;
        totalProfit += sale.merchantCommission;
      }
      detail.push(['Total', '', '', '', totalRevenue, totalProfit, '']);

      await downloadXlsx('ganancia-por-punto', [
        {
          name: 'Resumen',
          columns: ['Punto de venta', 'Ganancia', 'Ventas', 'Ticket promedio'],
          rows: this.rows().map((r) => [
            r.name,
            r.merchantProfit,
            r.soldCount,
            r.soldCount ? Math.round(r.revenue / r.soldCount) : null,
          ]),
        },
        {
          name: 'Detalle de ventas',
          columns: ['Punto de venta', 'Prenda', 'Categoría', 'Cedente', 'Monto vendido', 'Ganancia', 'Fecha'],
          rows: detail,
        },
      ]);
    } finally {
      this.exporting.set(false);
    }
  }

  protected reload(): void {
    this.retry$.next();
  }
}
