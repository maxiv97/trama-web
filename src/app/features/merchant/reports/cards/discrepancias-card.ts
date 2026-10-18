import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  firstValueFrom,
  map,
  Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { DISCREPANCY_OPTIONS, DISCREPANCY_LABELS } from '../../../../core/models/reception.labels';
import { ReceptionDiscrepancyReport } from '../../../../core/models/reception-discrepancies.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { XlsxSheet, downloadXlsx } from '../../../../shared/xlsx/to-xlsx';

interface TypeRow {
  label: string;
  count: number;
  share: number;
}

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ReceptionDiscrepancyReport };

@Component({
  selector: 'app-discrepancias-card',
  imports: [LoadingSpinner, ErrorState],
  template: `
    <div id="rep-discrepancias" class="t-card scroll-mt-4 p-5">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="font-display text-lg font-semibold text-trama-dark">
            ¿Cuántas prendas recibidas tuvieron observaciones?
          </h2>
          <p class="mt-1 text-sm text-trama-dark/50">
            Prendas recibidas del período, tasa con observaciones y desglose por tipo.
          </p>
        </div>
        @if (typeRows().length) {
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
        <app-loading-spinner />
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar el reporte." (retry)="reload()" />
      } @else if (report(); as r) {
        <div class="mb-4 flex gap-6">
          <div>
            <div class="text-xs text-trama-dark/50">Prendas recibidas</div>
            <div class="font-display text-2xl font-semibold text-trama-dark">{{ r.totalReceptions }}</div>
          </div>
          <div>
            <div class="text-xs text-trama-dark/50">Con observaciones</div>
            <div class="font-display text-2xl font-semibold text-trama-dark">{{ r.withDiscrepancies }}</div>
          </div>
          <div>
            <div class="text-xs text-trama-dark/50">Tasa</div>
            <div
              class="font-display text-2xl font-semibold"
              [class]="(r.rate ?? 0) > 25 ? 'text-status-none' : 'text-trama-dark'"
            >
              {{ r.rate === null ? '—' : r.rate + '%' }}
            </div>
          </div>
        </div>

        @if (typeRows().length) {
          <div class="space-y-2">
            @for (row of typeRows(); track row.label) {
              <div class="flex items-center gap-3 text-sm">
                <span class="w-44 font-medium text-trama-dark">{{ row.label }}</span>
                <span class="h-2 flex-1 overflow-hidden rounded-full bg-trama-sand-100">
                  <span class="block h-2 rounded-full bg-trama-green-700" [style.width.%]="row.share"></span>
                </span>
                <span class="w-10 text-right text-trama-dark/60">{{ row.share }}%</span>
                <span class="w-8 text-right font-medium text-trama-dark">{{ row.count }}</span>
              </div>
            }
          </div>
          <p class="mt-4 text-xs text-trama-dark/50">
            Una prenda puede tener más de una observación; el porcentaje es sobre el total de
            observaciones del período.
          </p>
        } @else {
          <p class="text-sm text-trama-dark/60">Ninguna prenda del período se recibió con observaciones.</p>
        }
      }
    </div>
  `,
})
export class DiscrepanciasCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);

  private readonly filters$ = toObservable(this.filters.current);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([this.filters$, this.retry$]).pipe(
      switchMap(([f]) =>
        this.reportsService.discrepancies(f).pipe(
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

  protected readonly typeRows = computed<TypeRow[]>(() => {
    const byType = this.report()?.byType ?? [];
    const total = byType.reduce((sum, t) => sum + t.count, 0);
    return byType.map((t) => ({
      label: DISCREPANCY_LABELS[t.discrepancy] ?? t.discrepancy,
      count: t.count,
      share: total ? Math.round((t.count / total) * 100) : 0,
    }));
  });

  protected readonly exporting = signal(false);

  // Excel with a summary tab plus one tab per observation type listing the garments that had it,
  // pulled from the detail endpoint (the aggregate report only carries counts).
  protected async exportXlsx(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const detail = await firstValueFrom(
        this.reportsService.discrepanciesDetail(this.filters.current()),
      );
      const sheets: XlsxSheet[] = [
        {
          name: 'Resumen',
          columns: ['Observación', 'Prendas', 'Del total %'],
          rows: this.typeRows().map((r) => [r.label, r.count, r.share]),
        },
      ];
      for (const option of DISCREPANCY_OPTIONS) {
        const rows = detail.filter((d) => d.discrepancies.includes(option.value));
        if (!rows.length) continue;
        sheets.push({
          name: option.label,
          columns: ['Prenda', 'Cedente', 'Categoría', 'Días en stock', 'Fecha recepción'],
          rows: rows.map((d) => [
            d.garmentName,
            d.consignorName,
            d.category,
            d.daysInStock,
            new Date(d.receivedAt).toISOString().slice(0, 10),
          ]),
        });
      }
      await downloadXlsx('observaciones', sheets);
    } finally {
      this.exporting.set(false);
    }
  }

  protected reload(): void {
    this.retry$.next();
  }
}
