import { Users, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { Component, computed, inject, signal, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, map, Observable, of, startWith, switchMap } from 'rxjs';
import { ConsignorPerformance } from '../../../core/models/consignor-performance.model';
import { ReportsService } from '../../../core/services/reports.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { ChipOption, DataTable, pageOf, SearchField } from '../../../shared/components/data-table/data-table';
import { Avatar } from '../../../shared/components/avatar/avatar';

type ConsignorsState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ConsignorPerformance[] };

@Component({
  selector: 'app-consignors',
  imports: [Avatar, LucideAngularModule, SearchField, DataTable, PageSkeleton, PageHeader, RouterLink, StatCard, MoneyPipe, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="table" />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar los cedentes." (retry)="retry()" />
    } @else if (data(); as rows) {
      <div class="space-y-6">
        <app-page-header title="Mis cedentes" section="Mis cedentes" [icon]="headerIcon" lead="Quiénes te consignan prendas, cuánto venden y cuánto tardás en pagarles." />

        <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <app-stat-card title="Cedentes" [value]="rows.length" [highlight]="true" />
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
          />
        </div>

        <app-data-table [total]="filteredRows().length" [shown]="pageRows().length" noun="cedentes" [(page)]="page">
          <app-search-field toolbar [(value)]="search" placeholder="Buscar por nombre, DNI o email" />
          @if (filteredRows().length) {
            <table class="t-table">
              <thead>
                <tr>
                  <th>Cedente</th>
                  <th>Contacto</th>
                  <th class="t-num">Aceptación</th>
                  <th class="t-num">Tasa de venta</th>
                  <th class="t-num">Liquidación</th>
                  <th class="t-num">En stock</th>
                  <th class="t-num">Ganancia</th>
                  <th class="t-num">Pendiente</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of pageRows(); track row.consignorId) {
                  <tr class="t-row-link" [routerLink]="['/m/inventory']" [queryParams]="{ consignor: row.consignorId }">
                    <td class="t-cell-main">
                      <div class="flex items-center gap-3">
                        <app-avatar [name]="row.name" [size]="38" [verified]="row.verified ? true : null" />
                        <span class="min-w-0">
                          <span class="block truncate font-bold">{{ row.name }}</span>
                          <span class="t-meta">DNI {{ row.dni }}</span>
                        </span>
                      </div>
                    </td>
                    <td data-label="Contacto" class="max-w-[200px]">
                      <span class="block truncate">{{ row.email }}</span>
                      <span class="t-meta">{{ row.phone }}</span>
                    </td>
                    <td data-label="Aceptación" class="t-num">
                      @if (row.acceptanceRate === null) {
                        <span class="t-muted">—</span>
                      } @else {
                        <a
                          [routerLink]="['/m/proposals']"
                          [queryParams]="{ consignor: row.consignorId }"
                          (click)="$event.stopPropagation()"
                          title="Ver sus propuestas"
                          class="t-amount text-trama-brand hover:underline"
                          >{{ row.acceptanceRate }}%</a
                        >
                      }
                    </td>
                    <td data-label="Tasa de venta" class="t-num">
                      @if (row.sellThroughRate === null) {
                        <span class="t-muted">—</span>
                      } @else {
                        <span class="t-amount">{{ row.sellThroughRate }}%</span>
                        <span class="t-meta">{{ row.soldCount }} de {{ row.receivedCount }}</span>
                      }
                    </td>
                    <td data-label="Liquidación" class="t-num t-muted">
                      {{ row.avgPayoutDays === null ? '—' : row.avgPayoutDays + ' días' }}
                    </td>
                    <td data-label="En stock" class="t-num t-amount">{{ row.inStockCount }}</td>
                    <td data-label="Ganancia" class="t-num t-amount">{{ row.merchantProfit | money }}</td>
                    <td data-label="Pendiente" class="t-num t-amount">{{ row.pendingAmount | money }}</td>
                    <td class="t-chev"><lucide-angular [img]="chevIcon" [size]="18" /></td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <app-empty-state [compact]="true" [icon]="headerIcon" title="No encontramos cedentes" message="Probá con otro nombre, DNI o email." />
          }
        </app-data-table>
      </div>
    }
  `,
})
export class Consignors {
  protected readonly chevIcon = ChevronRight;
  protected readonly headerIcon = Users;
  private readonly reportsService = inject(ReportsService);

  protected readonly search = signal('');
  protected readonly page = linkedSignal({ source: this.search, computation: () => 0 });
  protected readonly pageRows = computed(() => pageOf(this.filteredRows(), this.page()));

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
