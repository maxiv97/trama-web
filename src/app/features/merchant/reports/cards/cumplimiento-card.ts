import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { ConsignorPerformance } from '../../../../core/models/consignor-performance.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { downloadCsv } from '../../../../shared/csv/to-csv';

type SortKey = 'entrega' | 'retiro';

const TOP = 5;

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ConsignorPerformance[] };

// Cumplimiento del cedente con el comercio: entrega (de lo que acordó, cuánto trajo) y retiro (de
// lo que no se vendió, cuánto fue a buscar). Ordena peor primero para ver quiénes no cumplen. Los
// datos son por comercio: nunca muestran el historial del cedente con otros comercios.
@Component({
  selector: 'app-cumplimiento-card',
  imports: [ErrorState, EmptyState],
  template: `
    <div id="rep-cumplimiento" class="t-card scroll-mt-24 p-6">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-title-3 text-trama-dark">
            {{ sort() === 'entrega' ? '¿Qué cedentes entregan lo que acuerdan?' : '¿Qué cedentes retiran lo que no se vende?' }}
          </h2>
          <p class="mt-1 text-sm text-trama-muted">
            Entrega: de lo acordado, cuánto trajeron. Retiro: de lo que no se vendió, cuánto
            fueron a buscar. Ordenado de menor a mayor cumplimiento.
          </p>
        </div>
        @if (rows().length) {
          <button (click)="exportCsv()" class="shrink-0 t-btn t-btn-secondary t-btn-sm">CSV</button>
        }
      </div>

      @if (rows().length) {
        <div class="mb-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Ordenar por">
          <span class="text-[13px] font-semibold text-trama-muted">Ordenar por</span>
          <button type="button" role="radio" class="t-chip px-3! py-1.5! text-[13px]!" [attr.aria-checked]="sort() === 'entrega'" (click)="sortBy('entrega')">Cumplimiento de entrega</button>
          <button type="button" role="radio" class="t-chip px-3! py-1.5! text-[13px]!" [attr.aria-checked]="sort() === 'retiro'" (click)="sortBy('retiro')">Cumplimiento de retiro</button>
        </div>
      }

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
                <th>Entregó</th>
                <th>No entregó</th>
                <th>Tasa de entrega</th>
                <th>Retiró</th>
                <th>No retiró</th>
                <th>Por retirar</th>
                <th>Tasa de retiro</th>
              </tr>
            </thead>
            <tbody>
              @for (row of visible(); track row.consignorId) {
                <tr>
                  <td class="t-cell-main font-bold">{{ row.name }}</td>
                  <td data-label="Entregó" class="text-trama-body">{{ row.deliveredCount }}</td>
                  <td data-label="No entregó" class="text-trama-body">{{ row.deliveryExpiredCount }}</td>
                  <td data-label="Tasa de entrega">{{ rateCell(row.deliveryRate) }}</td>
                  <td data-label="Retiró" class="text-trama-body">{{ row.returnedCount }}</td>
                  <td data-label="No retiró" class="text-trama-body">{{ row.unclaimedCount }}</td>
                  <td data-label="Por retirar" class="text-trama-body">{{ row.awaitingPickupCount }}</td>
                  <td data-label="Tasa de retiro">{{ rateCell(row.pickupRate) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Gráfico: cumplimiento del criterio elegido, de menor a mayor. Verde = cumplió, rojo = no. -->
        <div class="mt-5 space-y-2.5">
          <p class="text-[13px] font-semibold text-trama-muted">
            {{ sort() === 'entrega' ? 'Entregadas vs. no entregadas' : 'Retiradas vs. no retiradas' }}
          </p>
          @for (row of visible(); track row.consignorId) {
            <div class="flex items-center gap-3">
              <span class="w-32 shrink-0 truncate text-sm text-trama-dark">{{ row.name }}</span>
              <svg viewBox="0 0 100 10" preserveAspectRatio="none" class="h-2.5 flex-1" role="img"
                [attr.aria-label]="barLabel(row)">
                <rect x="0" y="0" width="100" height="10" rx="3" fill="var(--color-status-none-soft)" />
                @if (good(row) !== null) {
                  <rect x="0" y="0" [attr.width]="good(row)" height="10" rx="3" fill="var(--color-status-agreed)" />
                }
              </svg>
              <span class="w-12 shrink-0 text-right text-[13px] font-semibold"
                [class]="good(row) === null ? 'text-trama-muted' : good(row)! >= 70 ? 'text-status-agreed' : 'text-status-none'">
                {{ good(row) === null ? '—' : good(row) + '%' }}
              </span>
            </div>
          }
        </div>

        @if (rows().length > top) {
          <button (click)="toggle()" class="mt-4 text-sm font-semibold text-trama-brand">
            {{ showAll() ? 'Ver solo los ' + top : 'Ver todos (' + rows().length + ')' }}
          </button>
        }
      } @else {
        <app-empty-state message="Todavía no hay plazos cumplidos ni vencidos para este recorte." />
      }
    </div>
  `,
})
export class CumplimientoCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);

  protected readonly sort = signal<SortKey>('entrega');
  protected readonly top = TOP;
  protected readonly showAll = signal(false);

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

  // Sólo los cedentes con algún plazo decidido (entregó/no entregó, retiró/no retiró o aún por
  // retirar); el resto no aporta al cumplimiento. Peor cumplimiento del criterio elegido primero.
  protected readonly rows = computed(() => {
    const current = this.state();
    if (current.status !== 'loaded') return [];
    const relevant = current.data.filter(
      (r) =>
        r.deliveredCount + r.deliveryExpiredCount > 0 ||
        r.returnedCount + r.unclaimedCount + r.awaitingPickupCount > 0,
    );
    const key = this.sort();
    const rate = (r: ConsignorPerformance) =>
      (key === 'entrega' ? r.deliveryRate : r.pickupRate) ?? Infinity; // sin datos, al final
    return relevant.sort((a, b) => rate(a) - rate(b) || a.name.localeCompare(b.name));
  });

  protected readonly visible = computed(() =>
    this.showAll() ? this.rows() : this.rows().slice(0, TOP),
  );

  // Porcentaje "bueno" (verde) según el criterio elegido: tasa de entrega o de retiro.
  protected good(row: ConsignorPerformance): number | null {
    return this.sort() === 'entrega' ? row.deliveryRate : row.pickupRate;
  }

  protected rateCell(rate: number | null): string {
    return rate === null ? '—' : rate + '%';
  }

  protected barLabel(row: ConsignorPerformance): string {
    const value = this.good(row);
    const what = this.sort() === 'entrega' ? 'entrega' : 'retiro';
    return value === null ? `${row.name}: sin datos de ${what}` : `${row.name}: ${value}% de ${what}`;
  }

  protected toggle(): void {
    this.showAll.update((v) => !v);
  }

  protected exportCsv(): void {
    downloadCsv(
      'cumplimiento-cedentes',
      ['Cedente', 'Entregó', 'No entregó', 'Tasa de entrega %', 'Retiró', 'No retiró', 'Por retirar', 'Tasa de retiro %'],
      this.rows().map((r) => [
        r.name,
        r.deliveredCount,
        r.deliveryExpiredCount,
        r.deliveryRate ?? '',
        r.returnedCount,
        r.unclaimedCount,
        r.awaitingPickupCount,
        r.pickupRate ?? '',
      ]),
    );
  }

  protected sortBy(key: SortKey): void {
    this.sort.set(key);
  }

  protected reload(): void {
    this.retry$.next();
  }
}
