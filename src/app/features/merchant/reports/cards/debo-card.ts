import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { MonthlyPayout } from '../../../../core/models/payout.model';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { PayoutsService } from '../../../../core/services/payouts.service';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

type State =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: MonthlyPayout[] };

@Component({
  selector: 'app-debo-card',
  imports: [RouterLink, MoneyPipe, LoadingSpinner, ErrorState],
  template: `
    <div id="rep-debo" class="scroll-mt-4 rounded-2xl border border-trama-sand-200 bg-white p-5">
      <div class="mb-4">
        <h2 class="font-display text-lg font-semibold text-trama-dark">
          ¿Cuánto debo y qué está vencido?
        </h2>
        <p class="mt-1 text-sm text-trama-dark/50">Liquidaciones por estado, en el período filtrado.</p>
      </div>

      @if (isLoading()) {
        <app-loading-spinner />
      } @else if (isError()) {
        <app-error-state message="No pudimos cargar las liquidaciones." (retry)="reload()" />
      } @else {
        <div class="mb-4 flex gap-6">
          <div>
            <div class="text-xs text-trama-dark/50">Vencido</div>
            <div class="font-display text-xl font-semibold text-status-none">{{ totals().overdue | money }}</div>
          </div>
          <div>
            <div class="text-xs text-trama-dark/50">Pendiente</div>
            <div class="font-display text-xl font-semibold text-trama-dark">{{ totals().pending | money }}</div>
          </div>
          <div>
            <div class="text-xs text-trama-dark/50">Pagado</div>
            <div class="font-display text-xl font-semibold text-trama-green-700">{{ totals().paid | money }}</div>
          </div>
        </div>

        @if (totals().total) {
          <div class="mb-3 flex h-3 overflow-hidden rounded-full bg-trama-sand-100">
            <span class="block bg-status-none" [style.width.%]="pct().overdue"></span>
            <span class="block bg-trama-gold" [style.width.%]="pct().pending"></span>
            <span class="block bg-trama-green-700" [style.width.%]="pct().paid"></span>
          </div>
        }

        <div class="flex items-center justify-between">
          <div class="flex flex-wrap gap-4 text-xs text-trama-dark/60">
            <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-status-none"></span>Vencido</span>
            <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-trama-gold"></span>Pendiente</span>
            <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-trama-green-700"></span>Pagado</span>
          </div>
          <a routerLink="/m/payouts" class="text-sm font-semibold text-trama-brand hover:underline">
            Ver detalle →
          </a>
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

  protected readonly pct = computed(() => {
    const { overdue, pending, paid, total } = this.totals();
    const share = (value: number): number => (total ? Math.round((value / total) * 100) : 0);
    return { overdue: share(overdue), pending: share(pending), paid: share(paid) };
  });

  protected reload(): void {
    this.retry$.next();
  }
}
