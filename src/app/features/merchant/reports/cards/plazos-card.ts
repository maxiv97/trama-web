import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { ExpiringConsignment } from '../../../../core/models/expiring-consignment.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { ShortDatePipe } from '../../../../shared/pipes/short-date.pipe';
import { downloadCsv } from '../../../../shared/csv/to-csv';

const WINDOW_DAYS = 90;
const TOP = 5;

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ExpiringConsignment[] };

@Component({
  selector: 'app-plazos-card',
  imports: [RouterLink, ShortDatePipe, ErrorState, EmptyState],
  template: `
    <div id="rep-plazos" class="t-card scroll-mt-24 p-6">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-title-3 text-trama-dark">
            ¿Qué plazos están por vencer?
          </h2>
          <p class="mt-1 text-sm text-trama-muted">
            Prendas en stock cuyo plazo de consignación vence en {{ windowDays }} días.
          </p>
        </div>
        @if (rows().length) {
          <button
            (click)="exportCsv()"
            class="shrink-0 t-btn t-btn-secondary t-btn-sm"
          >
            CSV
          </button>
        }
      </div>

      @if (isLoading()) {
        <div class="t-skeleton h-40" role="status" aria-label="Cargando"></div>
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar los plazos." (retry)="reload()" />
      } @else if (rows().length) {
        <div class="divide-y divide-trama-sand-100">
          @for (item of visible(); track item.garmentId) {
            <a
              [routerLink]="['/m/inventory', item.garmentId]"
              class="flex items-center gap-3 py-3 text-sm hover:bg-trama-sand-50 rounded-[14px] px-2 -mx-2"
            >
              <span class="min-w-0 flex-1 truncate font-medium text-trama-dark">{{ item.name }}</span>
              <span class="text-trama-body">{{ item.consignorName }}</span>
              <span class="text-trama-body">{{ item.effectiveDeadline | shortDate }}</span>
              <span
                [class]="
                  item.overdue
                    ? 'rounded-full bg-status-none-soft px-2 py-0.5 text-xs font-semibold text-status-none'
                    : 'text-trama-body'
                "
              >
                {{ daysLabel(item) }}
              </span>
              <span class="font-semibold text-trama-brand">→</span>
            </a>
          }
        </div>
        @if (extra()) {
          <p class="mt-3 text-[13px] font-semibold text-trama-body">
            Mostrando los {{ top }} más urgentes · +{{ extra() }} prenda(s) más — descargá el CSV para verlas todas.
          </p>
        }
      } @else {
        <app-empty-state
          [message]="'Ningún plazo vence en los próximos ' + windowDays + ' días con este recorte.'"
        />
      }
    </div>
  `,
})
export class PlazosCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);

  protected readonly windowDays = WINDOW_DAYS;

  private readonly filters$ = toObservable(this.filters.current);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([this.filters$, this.retry$]).pipe(
      switchMap(([f]) =>
        this.reportsService.expiring(WINDOW_DAYS, f).pipe(
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
  // The list can be long; show only the most urgent and send the rest to the CSV.
  protected readonly top = TOP;
  protected readonly visible = computed(() => this.rows().slice(0, TOP));
  protected readonly extra = computed(() => Math.max(0, this.rows().length - TOP));

  protected exportCsv(): void {
    downloadCsv(
      'plazos-por-vencer',
      ['Prenda', 'Cedente', 'Vence', 'Días restantes'],
      this.rows().map((r) => [
        r.name,
        r.consignorName,
        new Date(r.effectiveDeadline).toISOString().slice(0, 10),
        r.daysLeft,
      ]),
    );
  }

  protected daysLabel(item: ExpiringConsignment): string {
    if (item.overdue) {
      const days = Math.abs(item.daysLeft);
      return `Vencido hace ${days} ${days === 1 ? 'día' : 'días'}`;
    }
    return `${item.daysLeft} ${item.daysLeft === 1 ? 'día' : 'días'}`;
  }

  protected reload(): void {
    this.retry$.next();
  }
}
