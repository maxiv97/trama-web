import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { RotationReport } from '../../../../core/models/rotation.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { downloadCsv } from '../../../../shared/csv/to-csv';

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: RotationReport };

@Component({
  selector: 'app-rota-card',
  imports: [LoadingSpinner, ErrorState, EmptyState],
  template: `
    <div id="rep-rota" class="scroll-mt-4 rounded-2xl border border-trama-sand-200 bg-white p-5">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="font-display text-lg font-semibold text-trama-dark">¿Qué stock no rota?</h2>
          <p class="mt-1 text-sm text-trama-dark/50">Prendas en stock por antigüedad, en cantidad.</p>
        </div>
        @if (totalStock()) {
          <button
            (click)="exportCsv()"
            class="shrink-0 rounded-lg border border-trama-sand-200 px-3 py-1.5 text-xs font-semibold text-trama-dark/70 hover:bg-trama-sand-50"
          >
            CSV
          </button>
        }
      </div>

      @if (isLoading()) {
        <app-loading-spinner />
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar la rotación." (retry)="reload()" />
      } @else if (report(); as r) {
        @if (totalStock()) {
          <div class="space-y-2">
            @for (bucket of r.stockAging; track bucket.bucket) {
              <div class="flex items-center gap-3 text-sm">
                <span class="w-16 text-right text-trama-dark/60">{{ bucket.bucket }}</span>
                <span class="h-5 flex-1 overflow-hidden rounded bg-trama-sand-100">
                  <span
                    class="block h-5 rounded"
                    [class]="bucket.bucket === '+120' || bucket.bucket === '91-120' ? 'bg-status-none' : 'bg-trama-green-700'"
                    [style.width.%]="barWidth(bucket.count)"
                  ></span>
                </span>
                <span class="w-6 font-medium text-trama-dark">{{ bucket.count }}</span>
              </div>
            }
          </div>
          <div class="mt-4 border-t border-trama-sand-100 pt-3 text-sm text-trama-dark/60">
            <b class="text-trama-dark">{{ r.staleCount }}</b> prenda(s) llevan más de 90 días en stock.
            @if (r.avgDaysToSale !== null) {
              Días promedio a venta: <b class="text-trama-dark">{{ r.avgDaysToSale }}</b>.
            }
          </div>
        } @else {
          <app-empty-state message="No hay prendas en stock con este recorte." />
        }
      }
    </div>
  `,
})
export class RotaCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);

  private readonly filters$ = toObservable(this.filters.current);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([this.filters$, this.retry$]).pipe(
      switchMap(([f]) =>
        this.reportsService.rotation(f).pipe(
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
  protected readonly report = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });
  protected readonly totalStock = computed(() =>
    (this.report()?.stockAging ?? []).reduce((sum, b) => sum + b.count, 0),
  );

  protected exportCsv(): void {
    downloadCsv(
      'stock-por-antiguedad',
      ['Antigüedad (días)', 'Prendas'],
      (this.report()?.stockAging ?? []).map((b) => [b.bucket, b.count]),
    );
  }

  protected barWidth(count: number): number {
    const max = Math.max(1, ...(this.report()?.stockAging ?? []).map((b) => b.count));
    return count ? Math.max(4, Math.round((count / max) * 100)) : 0;
  }

  protected reload(): void {
    this.retry$.next();
  }
}
