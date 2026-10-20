import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { CategorySales } from '../../../../core/models/category-sales.model';
import { GarmentStatus } from '../../../../core/models/garment.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { GarmentsService } from '../../../../core/services/garments.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { downloadCsv } from '../../../../shared/csv/to-csv';
import { DrillModal, DrillRow } from '../drill-modal/drill-modal';

const RECEIVED: GarmentStatus[] = ['in_stock', 'with_remarks', 'sold', 'paid_out'];

type SortKey = 'ganancia' | 'conversion' | 'dias';

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: CategorySales[] };

@Component({
  selector: 'app-conviene-card',
  imports: [MoneyPipe, ErrorState, EmptyState, DrillModal],
  template: `
    <div
      id="rep-conviene"
      class="t-card scroll-mt-24 p-6"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-title-3 text-trama-dark">¿Qué me conviene recibir?</h2>
          <p class="mt-1 text-sm text-trama-muted">
            Ganancia, conversión y días a venta del período filtrado; stock a hoy.
          </p>
        </div>
        @if (rows().length) {
          <button (click)="exportCsv()" [class]="csvBtn">CSV</button>
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
                <th>Categoría</th>
                <th>
                  <button (click)="sortBy('ganancia')" [class]="thClass('ganancia')">Ganancia</button>
                </th>
                <th>
                  <button (click)="sortBy('conversion')" [class]="thClass('conversion')">Conversión</button>
                </th>
                <th>
                  <button (click)="sortBy('dias')" [class]="thClass('dias')">Días a venta</button>
                </th>
                <th>En stock</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.category) {
                <tr>
                  <td>
                    <button
                      (click)="openDrill(row.category)"
                      class="font-medium text-trama-dark hover:text-trama-brand hover:underline"
                    >
                      {{ row.category }}
                    </button>
                  </td>
                  <td class="t-amount">{{ row.merchantProfit | money }}</td>
                  <td class="text-trama-body">
                    {{ row.conversion === null ? '—' : row.conversion + '%' }}
                  </td>
                  <td class="text-trama-body">
                    {{ row.avgDaysToSale === null ? '—' : row.avgDaysToSale + ' días' }}
                  </td>
                  <td class="text-trama-body">{{ row.inStockCount }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <app-empty-state message="No hay datos para este recorte." />
      }

      @if (drill(); as d) {
        <app-drill-modal
          question="¿Qué me conviene recibir?"
          [title]="d.title"
          [rows]="d.rows"
          [csvName]="d.csvName"
          (close)="drill.set(null)"
        />
      }
    </div>
  `,
})
export class ConvieneCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);
  private readonly garmentsService = inject(GarmentsService);

  protected readonly sort = signal<SortKey>('ganancia');
  protected readonly drill = signal<{ title: string; rows: DrillRow[]; csvName: string } | null>(null);

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
    'shrink-0 t-btn t-btn-secondary t-btn-sm';

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

  // Drill into a category: the received garments behind that row, honouring the recorte
  // dimensions (the clicked category overrides the category filter).
  protected openDrill(category: string): void {
    const sp = this.filters.salesPointId();
    const consignor = this.filters.consignorId();
    this.garmentsService.listMeta().subscribe((garments) => {
      const rows: DrillRow[] = garments
        .filter(
          (g) =>
            g.category === category &&
            RECEIVED.includes(g.status) &&
            (!sp || g.salesPointId === sp) &&
            (!consignor || g.consignorId === consignor),
        )
        .map((g) => ({ name: g.name, meta: g.brand, status: g.status }));
      this.drill.set({ title: `Prendas de ${category}`, rows, csvName: `prendas-${category}` });
    });
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
