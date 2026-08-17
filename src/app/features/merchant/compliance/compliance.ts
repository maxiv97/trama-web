import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ExpiringConsignment } from '../../../core/models/expiring-consignment.model';
import { MonthlyPayout } from '../../../core/models/payout.model';
import { PayoutsService } from '../../../core/services/payouts.service';
import { ReportsService } from '../../../core/services/reports.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { monthLabel } from '../../../core/utils/month.util';

const EXPIRY_WINDOW_DAYS = 90;

interface ComplianceData {
  overdue: MonthlyPayout[];
  expiring: ExpiringConsignment[];
}

type ComplianceState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ComplianceData };

@Component({
  selector: 'app-compliance',
  imports: [RouterLink, StatCard, MoneyPipe, ShortDatePipe, LoadingSpinner, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar el panel de cumplimiento." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl font-semibold text-trama-dark">Cumplimiento y riesgo</h1>
          <p class="mt-1 text-sm text-trama-dark/50">
            Dónde está la plata debida y qué prendas están por vencer su plazo de consignación.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <app-stat-card
            title="Liquidaciones vencidas"
            [value]="d.overdue.length"
            [color]="d.overdue.length ? 'red' : 'default'"
            [subtitle]="(summary().overdueAmount | money) + ' pendiente'"
          />
          <app-stat-card
            title="Plazos por vencer"
            [value]="d.expiring.length"
            [color]="summary().expiredCount ? 'red' : 'default'"
            [subtitle]="'Próximos ' + windowDays + ' días'"
          />
          <app-stat-card
            title="Plazos ya vencidos"
            [value]="summary().expiredCount"
            [color]="summary().expiredCount ? 'red' : 'default'"
          />
        </div>

        <section class="space-y-3">
          <h2 class="text-sm font-medium text-trama-dark/60">Liquidaciones vencidas</h2>
          @if (d.overdue.length) {
            <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                  <tr>
                    <th class="px-4 py-3 font-medium">Cedente</th>
                    <th class="px-4 py-3 font-medium">Mes</th>
                    <th class="px-4 py-3 font-medium">Pendiente</th>
                    <th class="px-4 py-3 font-medium">Venció</th>
                    <th class="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of d.overdue; track row.key) {
                    <tr class="border-b border-trama-sand-100 last:border-0">
                      <td class="px-4 py-3 font-medium text-trama-dark">{{ row.counterpartName }}</td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ monthLabel(row.month) }}</td>
                      <td class="px-4 py-3 font-medium text-status-none">{{ row.pendingAmount | money }}</td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ row.dueDate | shortDate }}</td>
                      <td class="px-4 py-3 text-right">
                        <a routerLink="/m/payouts" class="text-sm font-medium text-trama-brand hover:underline">Liquidar</a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state message="No hay liquidaciones vencidas. Todo al día." />
          }
        </section>

        <section class="space-y-3">
          <h2 class="text-sm font-medium text-trama-dark/60">Plazos de consignación por vencer</h2>
          @if (d.expiring.length) {
            <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                  <tr>
                    <th class="px-4 py-3 font-medium">Prenda</th>
                    <th class="px-4 py-3 font-medium">Cedente</th>
                    <th class="px-4 py-3 font-medium">Vence</th>
                    <th class="px-4 py-3 font-medium">Plazo</th>
                    <th class="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of d.expiring; track item.garmentId) {
                    <tr class="border-b border-trama-sand-100 last:border-0">
                      <td class="px-4 py-3 font-medium text-trama-dark">{{ item.name }}</td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ item.consignorName }}</td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ item.effectiveDeadline | shortDate }}</td>
                      <td class="px-4 py-3">
                        <span [class]="item.overdue ? 'font-medium text-status-none' : 'text-trama-dark/70'">
                          {{ daysLabel(item) }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-right">
                        <a
                          [routerLink]="['/m/inventory', item.garmentId]"
                          class="text-sm font-medium text-trama-brand hover:underline"
                          >Ver</a
                        >
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state [message]="'Ninguna prenda vence en los próximos ' + windowDays + ' días.'" />
          }
        </section>
      </div>
    }
  `,
})
export class Compliance {
  private readonly auth = inject(AuthService);
  private readonly payoutsService = inject(PayoutsService);
  private readonly reportsService = inject(ReportsService);

  protected readonly windowDays = EXPIRY_WINDOW_DAYS;
  protected readonly monthLabel = monthLabel;

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): ComplianceState => ({ status: 'loaded', data })),
          startWith<ComplianceState>({ status: 'loading', data: null }),
          catchError((): Observable<ComplianceState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as ComplianceState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly summary = computed(() => {
    const d = this.data();
    return {
      overdueAmount: (d?.overdue ?? []).reduce((total, row) => total + row.pendingAmount, 0),
      expiredCount: (d?.expiring ?? []).filter((item) => item.overdue).length,
    };
  });

  protected retry(): void {
    this.reload.next();
  }

  protected daysLabel(item: ExpiringConsignment): string {
    if (item.overdue) {
      const days = Math.abs(item.daysLeft);
      return `Vencido hace ${days} ${days === 1 ? 'día' : 'días'}`;
    }
    return `${item.daysLeft} ${item.daysLeft === 1 ? 'día' : 'días'}`;
  }

  private load(): Observable<ComplianceData> {
    const merchantId = this.auth.user()?.id ?? '';
    return forkJoin({
      monthly: this.payoutsService.monthlyByMerchant(merchantId),
      expiring: this.reportsService.expiring(EXPIRY_WINDOW_DAYS),
    }).pipe(
      map(({ monthly, expiring }): ComplianceData => ({
        overdue: monthly.filter((row) => row.status === 'overdue'),
        expiring,
      })),
    );
  }
}
