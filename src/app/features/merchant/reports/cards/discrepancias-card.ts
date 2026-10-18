import { Component, computed, inject, signal } from '@angular/core';
import { BarDatum, BarThin } from '../../../../shared/components/charts/charts';
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
  imports: [BarThin, ErrorState],
  template: `
    <div id="rep-discrepancias" class="t-card scroll-mt-24 p-6">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-title-3 text-trama-dark">
            ¿Cuántas prendas recibidas tuvieron observaciones?
          </h2>
          <p class="mt-1 text-sm text-trama-muted">
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
        <div class="t-skeleton h-40" role="status" aria-label="Cargando"></div>
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar el reporte." (retry)="reload()" />
      } @else if (report(); as r) {
        <div class="mb-4 flex gap-6">
          <div>
            <div class="text-[13px] font-semibold text-trama-body">Prendas recibidas</div>
            <div class="text-number text-trama-dark">{{ r.totalReceptions }}</div>
          </div>
          <div>
            <div class="text-[13px] font-semibold text-trama-body">Con observaciones</div>
            <div class="text-number text-trama-dark">{{ r.withDiscrepancies }}</div>
          </div>
          <div>
            <div class="text-[13px] font-semibold text-trama-body">Tasa</div>
            <div
              class="text-number"
              [class]="(r.rate ?? 0) > 25 ? 'text-status-none' : 'text-trama-dark'"
            >
              {{ r.rate === null ? '—' : r.rate + '%' }}
            </div>
          </div>
        </div>

        @if (typeRows().length) {
          <app-bar-thin [data]="typeBars()" [labelWidth]="170" />
          <p class="mt-4 text-[13px] font-semibold text-trama-body">
            Una prenda puede tener más de una observación; el porcentaje es sobre el total de
            observaciones del período.
          </p>
        } @else {
          <p class="text-sm text-trama-body">Ninguna prenda del período se recibió con observaciones.</p>
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

  protected readonly typeBars = computed<BarDatum[]>(() =>
    this.typeRows().map((r) => ({ label: r.label, value: r.count, display: r.count + ' · ' + r.share + '%' })),
  );
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
