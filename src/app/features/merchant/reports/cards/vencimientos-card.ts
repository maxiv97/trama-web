import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { ExpiryOutcomes } from '../../../../core/models/expiry-outcomes.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';

interface Segment {
  label: string;
  count: number;
  color: string;
}

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ExpiryOutcomes };

// Stock y vencimientos: de las prendas que terminaron la ventana de venta sin venderse, cuántas
// retiró el cedente y cuántas no, y qué destino se les dio a las no retiradas. Por comercio.
@Component({
  selector: 'app-vencimientos-card',
  imports: [ErrorState, EmptyState],
  template: `
    <div id="rep-vencimientos" class="t-card scroll-mt-24 p-6">
      <div class="mb-4">
        <h2 class="text-title-3 text-trama-dark">¿Qué pasa con lo que no se vende?</h2>
        <p class="mt-1 text-sm text-trama-muted">
          De las prendas que terminaron su ventana de venta sin venderse: cuántas retiró el
          cedente y cuántas no, y qué destino se les dio a las no retiradas.
        </p>
      </div>

      @if (isLoading()) {
        <div class="t-skeleton h-40" role="status" aria-label="Cargando"></div>
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar el reporte." (retry)="reload()" />
      } @else if (data(); as d) {
        @if (d.expiredCount === 0) {
          <app-empty-state message="Todavía no hay prendas vencidas para este recorte." />
        } @else {
          <div class="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <!-- Barra apilada: retiradas / por retirar / no retiradas. -->
              <div class="flex h-4 w-full overflow-hidden rounded-full bg-trama-sand-50" role="img"
                [attr.aria-label]="'De ' + d.expiredCount + ' prendas vencidas: ' + d.returnedCount + ' retiradas, ' + d.awaitingPickupCount + ' por retirar, ' + d.unclaimedCount + ' no retiradas'">
                @for (seg of segments(); track seg.label) {
                  @if (seg.count > 0) {
                    <div [style.width.%]="pct(seg.count)" [style.background]="seg.color"></div>
                  }
                }
              </div>
              <ul class="mt-4 space-y-2">
                @for (seg of segments(); track seg.label) {
                  <li class="flex items-center gap-2 text-sm">
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full" [style.background]="seg.color"></span>
                    <span class="text-trama-body">{{ seg.label }}</span>
                    <span class="ml-auto font-semibold text-trama-dark">{{ seg.count }}</span>
                  </li>
                }
              </ul>
            </div>

            <div class="sm:w-40 sm:border-l sm:border-trama-sand-100 sm:pl-6">
              <p class="text-eyebrow">Tasa de retiro</p>
              <p class="mt-1 text-[32px] font-bold leading-none"
                [class]="d.pickupRate === null ? 'text-trama-muted' : d.pickupRate >= 70 ? 'text-status-agreed' : 'text-status-none'">
                {{ d.pickupRate === null ? '—' : d.pickupRate + '%' }}
              </p>
              <p class="mt-1 text-[13px] text-trama-muted">de las resueltas, cuántas retiró el cedente</p>
            </div>
          </div>

          @if (d.unclaimedCount > 0) {
            <div class="mt-6 border-t border-trama-sand-100 pt-4">
              <p class="text-[13px] font-semibold text-trama-muted">Destino de las no retiradas</p>
              <div class="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <span class="text-trama-body">Donadas <b class="ml-1 text-trama-dark">{{ d.donatedCount }}</b></span>
                <span class="text-trama-body">Conservadas <b class="ml-1 text-trama-dark">{{ d.keptCount }}</b></span>
                <span class="text-trama-body">Otro destino <b class="ml-1 text-trama-dark">{{ d.otherCount }}</b></span>
                @if (d.unclaimedPendingCount > 0) {
                  <span class="text-status-pending">Sin destino registrado <b class="ml-1">{{ d.unclaimedPendingCount }}</b></span>
                }
              </div>
            </div>
          }
        }
      }
    </div>
  `,
})
export class VencimientosCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly reportsService = inject(ReportsService);

  private readonly filters$ = toObservable(this.filters.current);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([this.filters$, this.retry$]).pipe(
      switchMap(([f]) =>
        this.reportsService.expiryOutcomes(f).pipe(
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
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly segments = computed<Segment[]>(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Retiradas por el cedente', count: d.returnedCount, color: 'var(--color-status-agreed)' },
      { label: 'Por retirar', count: d.awaitingPickupCount, color: 'var(--color-status-pending)' },
      { label: 'No retiradas', count: d.unclaimedCount, color: 'var(--color-status-none)' },
    ];
  });

  protected pct(count: number): number {
    const total = this.data()?.expiredCount ?? 0;
    return total ? (count / total) * 100 : 0;
  }

  protected reload(): void {
    this.retry$.next();
  }
}
