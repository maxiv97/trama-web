import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap } from 'rxjs';
import { ConsignorPerformance } from '../../../core/models/consignor-performance.model';
import { ReportsService } from '../../../core/services/reports.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

type ConsignorsState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ConsignorPerformance[] };

@Component({
  selector: 'app-consignors',
  imports: [RouterLink, StatCard, MoneyPipe, LoadingSpinner, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar los cedentes." (retry)="retry()" />
    } @else if (data(); as rows) {
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold text-trama-dark">Mis cedentes</h1>

        <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <app-stat-card title="Cedentes" [value]="rows.length" />
          <app-stat-card
            title="Aceptación promedio"
            [value]="summary().acceptanceRate === null ? '—' : summary().acceptanceRate + '%'"
          />
          <app-stat-card
            title="Liquidación promedio"
            [value]="summary().avgPayoutDays === null ? '—' : summary().avgPayoutDays + ' días'"
          />
          <app-stat-card title="Ganancia total" [value]="summary().merchantProfit | money" />
          <app-stat-card
            title="Liquidación pendiente"
            [value]="summary().pendingAmount | money"
            [color]="summary().pendingAmount ? 'red' : 'default'"
          />
        </div>

        <input
          type="search"
          [value]="search()"
          (input)="search.set($any($event.target).value)"
          placeholder="Buscar por nombre, DNI o email"
          class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm sm:max-w-sm"
        />

        @if (filteredRows().length) {
          <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Cedente</th>
                  <th class="px-4 py-3 font-medium">DNI</th>
                  <th class="px-4 py-3 font-medium">Contacto</th>
                  <th class="px-4 py-3 font-medium">Aceptación</th>
                  <th class="px-4 py-3 font-medium">Tasa de venta</th>
                  <th class="px-4 py-3 font-medium">Liquidación (prom.)</th>
                  <th class="px-4 py-3 font-medium">En stock</th>
                  <th class="px-4 py-3 font-medium">Ganancia</th>
                  <th class="px-4 py-3 font-medium">Liquidación pendiente</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.consignorId) {
                  <tr
                    [routerLink]="['/m/inventory']"
                    [queryParams]="{ consignor: row.consignorId }"
                    class="cursor-pointer border-b border-trama-sand-100 last:border-0 hover:bg-trama-sand-50"
                  >
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-trama-dark">{{ row.name }}</span>
                        @if (row.verified) {
                          <span
                            class="rounded-full bg-trama-green-100 px-2 py-0.5 text-xs font-medium text-trama-green-700"
                          >
                            Verificado
                          </span>
                        }
                      </div>
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.dni }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">
                      <div>{{ row.email }}</div>
                      <div class="text-trama-dark/50">{{ row.phone }}</div>
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">
                      @if (row.acceptanceRate === null) {
                        —
                      } @else {
                        <a
                          [routerLink]="['/m/proposals']"
                          [queryParams]="{ consignor: row.consignorId }"
                          (click)="$event.stopPropagation()"
                          title="Ver sus propuestas"
                          class="font-medium text-trama-brand hover:underline"
                        >
                          {{ row.acceptanceRate }}%
                        </a>
                      }
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">
                      @if (row.sellThroughRate === null) {
                        —
                      } @else {
                        <div>{{ row.sellThroughRate }}%</div>
                        <div class="text-trama-dark/50">{{ row.soldCount }} de {{ row.receivedCount }}</div>
                      }
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">
                      {{ row.avgPayoutDays === null ? '—' : row.avgPayoutDays + ' días' }}
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.inStockCount }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.merchantProfit | money }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.pendingAmount | money }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state message="No hay cedentes que coincidan con la búsqueda." />
        }
      </div>
    }
  `,
})
export class Consignors {
  private readonly reportsService = inject(ReportsService);

  protected readonly search = signal('');

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.reportsService.consignors().pipe(
          map((data): ConsignorsState => ({ status: 'loaded', data })),
          startWith<ConsignorsState>({ status: 'loading', data: null }),
          catchError((): Observable<ConsignorsState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as ConsignorsState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly summary = computed(() => {
    const rows = this.data() ?? [];
    const totalAccepted = rows.reduce((sum, r) => sum + r.accepted, 0);
    const totalDecided = rows.reduce((sum, r) => sum + r.decided, 0);
    const withPayout = rows.filter((r) => r.avgPayoutDays !== null);
    const payoutAvg = withPayout.length
      ? Math.round(withPayout.reduce((sum, r) => sum + (r.avgPayoutDays ?? 0), 0) / withPayout.length)
      : null;
    return {
      acceptanceRate: totalDecided ? Math.round((totalAccepted / totalDecided) * 100) : null,
      avgPayoutDays: payoutAvg,
      merchantProfit: rows.reduce((sum, r) => sum + r.merchantProfit, 0),
      pendingAmount: rows.reduce((sum, r) => sum + r.pendingAmount, 0),
    };
  });

  protected readonly filteredRows = computed(() => {
    const rows = this.data();
    if (!rows) return [];
    const term = this.search().trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.dni.toLowerCase().includes(term) ||
        row.email.toLowerCase().includes(term),
    );
  });

  protected retry(): void {
    this.reload.next();
  }
}
