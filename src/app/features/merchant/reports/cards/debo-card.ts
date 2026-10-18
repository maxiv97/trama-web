import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { MonthlyPayout } from '../../../../core/models/payout.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { PayoutsService } from '../../../../core/services/payouts.service';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { StackSegment, StackedBar } from '../../../../shared/components/charts/charts';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: MonthlyPayout[] };

@Component({
  selector: 'app-debo-card',
  imports: [StackedBar, RouterLink, ErrorState],
  template: `
    <div id="rep-debo" class="t-card scroll-mt-24 p-6">
      <div class="mb-4">
        <h2 class="text-title-3 text-trama-dark">
          ¿Cuánto debo y qué está vencido?
        </h2>
        <p class="mt-1 text-sm text-trama-muted">Liquidaciones por estado, en el período filtrado.</p>
      </div>

      @if (isLoading()) {
        <div class="t-skeleton h-40" role="status" aria-label="Cargando"></div>
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar las liquidaciones." (retry)="reload()" />
      } @else {
        @if (totals().total) {
          <app-stacked-bar [segments]="segments()" />
        } @else {
          <p class="text-sm text-trama-body">No hay liquidaciones en el período.</p>
        }
        <div class="mt-5 flex justify-end">
          <a routerLink="/m/payouts" class="t-link">Ver detalle</a>
        </div>
      }
    </div>
  `,
})
export class DeboCard {
  private readonly filters = inject(DashboardFiltersService);
  private readonly payoutsService = inject(PayoutsService);
  private readonly auth = inject(AuthService);

  private readonly filters$ = toObservable(this.filters.current);
  private readonly retry$ = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([this.filters$, this.retry$]).pipe(
      switchMap(([f]) =>
        this.payoutsService.monthlyByMerchant(this.auth.user()?.id ?? '', f).pipe(
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

  protected readonly totals = computed(() => {
    const current = this.state();
    const groups = current.status === 'loaded' ? current.data : [];
    let overdue = 0;
    let pending = 0;
    let paid = 0;
    for (const group of groups) {
      paid += group.paidAmount;
      if (group.status === 'overdue') overdue += group.pendingAmount;
      else if (group.status === 'pending') pending += group.pendingAmount;
    }
    return { overdue, pending, paid, total: overdue + pending + paid };
  });

  private readonly moneyPipe = new MoneyPipe();
  protected readonly segments = computed<StackSegment[]>(() => {
    const t = this.totals();
    const m = (n: number): string => this.moneyPipe.transform(n);
    return [
      { label: 'Vencido', value: t.overdue, display: m(t.overdue), color: '#C0392B' },
      { label: 'Pendiente', value: t.pending, display: m(t.pending), color: '#F2B636' },
      { label: 'Pagado', value: t.paid, display: m(t.paid), color: '#2E7D54' },
    ];
  });

  protected readonly pct = computed(() => {
    const { overdue, pending, paid, total } = this.totals();
    const share = (value: number): number => (total ? Math.round((value / total) * 100) : 0);
    return { overdue: share(overdue), pending: share(pending), paid: share(paid) };
  });

  protected reload(): void {
    this.retry$.next();
  }
}
