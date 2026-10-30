import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CategorySales } from '../../../core/models/category-sales.model';
import { SummaryReport } from '../../../core/models/summary.model';
import { WeeklyPoint } from '../../../core/models/summary.model';
import { PayoutsService } from '../../../core/services/payouts.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { ReportsService } from '../../../core/services/reports.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

interface Urgencia {
  key: string;
  title: string;
  meta: string;
  actionLabel: string;
  link: unknown[];
  fragment?: string;
}

interface ResumenData {
  summary: SummaryReport;
  categories: CategorySales[];
  weekly: WeeklyPoint[];
  urgencias: Urgencia[];
  hasData: boolean;
}

type ResumenState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ResumenData };

const EXPIRY_URGENT_DAYS = 30;

@Component({
  selector: 'app-merchant-panel',
  imports: [RouterLink, MoneyPipe, LoadingSpinner, ErrorState, EmptyState],
  providers: [MoneyPipe],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar el resumen." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-8">
        <h1 class="font-display text-2xl font-semibold text-trama-dark">Resumen</h1>

        @if (!d.hasData) {
          <app-empty-state
            message="Todavía no hay ventas registradas. Cuando se venda la primera prenda vas a ver acá tu ganancia, qué categorías rinden y a quién le debés."
          />
        }

        <!-- Qué hacer hoy -->
        <section class="space-y-3">
          @if (d.urgencias.length) {
            <h2 class="font-display text-lg font-semibold text-trama-dark">Qué hacer hoy</h2>
            <div class="overflow-hidden rounded-2xl border border-trama-sand-200 bg-white">
              @for (u of d.urgencias; track u.key) {
                <div class="flex items-center gap-3 border-b border-trama-sand-100 px-4 py-3 last:border-0">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-trama-gold"></span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-trama-dark">{{ u.title }}</p>
                    <p class="text-xs text-trama-dark/50">{{ u.meta }}</p>
                  </div>
                  <a
                    [routerLink]="u.link"
                    [fragment]="u.fragment"
                    class="shrink-0 rounded-lg bg-trama-brand px-4 py-1.5 text-sm font-semibold text-white"
                  >
                    {{ u.actionLabel }}
                  </a>
                </div>
              }
            </div>
          } @else {
            <div class="flex items-center gap-3 rounded-2xl bg-trama-green-50 px-5 py-4">
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-trama-green-700 text-white"
                >✓</span
              >
              <div>
                <p class="font-display font-semibold text-trama-dark">Todo al día</p>
                <p class="text-sm text-trama-dark/50">No hay propuestas, vencimientos ni plazos urgentes.</p>
              </div>
            </div>
          }
        </section>

        <!-- El período en números -->
        <section class="space-y-3">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-trama-dark/40">El mes en números</h2>
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            @for (kpi of kpis(); track kpi.label) {
              <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
                <p class="text-sm text-trama-dark/50">{{ kpi.label }}</p>
                <p class="mt-1 font-display text-2xl font-semibold text-trama-dark">{{ kpi.value }}</p>
                @if (kpi.delta) {
                  <p class="mt-1 text-xs font-medium" [class]="kpi.up ? 'text-trama-green-700' : 'text-status-none'">
                    {{ kpi.delta }}
                  </p>
                } @else {
                  <p class="mt-1 text-xs text-trama-dark/40">sin período anterior</p>
                }
              </div>
            }
          </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Ganancia por categoría -->
          <section class="rounded-2xl border border-trama-sand-200 bg-white p-5">
            <div class="mb-4 flex items-baseline justify-between">
              <h2 class="font-display text-base font-semibold text-trama-dark">Ganancia por categoría</h2>
              <a routerLink="/m/reports" class="text-xs font-semibold text-trama-brand">Ver reporte</a>
            </div>
            @if (d.categories.length) {
              <div class="space-y-3">
                @for (c of d.categories; track c.category) {
                  <div>
                    <div class="mb-1 flex justify-between text-sm">
                      <span class="text-trama-dark/70">{{ c.category }}</span>
                      <span class="font-semibold text-trama-dark">{{ c.merchantProfit | money }}</span>
                    </div>
                    <span class="block h-2 rounded-full bg-trama-sand-100">
                      <span class="block h-2 rounded-full bg-trama-green-700" [style.width.%]="catWidth(c)"></span>
                    </span>
                  </div>
                }
              </div>
            } @else {
              <p class="text-sm text-trama-dark/50">Sin ventas por categoría todavía.</p>
            }
          </section>

          <!-- Ganancia por semana -->
          <section class="rounded-2xl border border-trama-sand-200 bg-white p-5">
            <div class="mb-4 flex items-baseline justify-between">
              <h2 class="font-display text-base font-semibold text-trama-dark">Ganancia por semana</h2>
              <span class="text-xs text-trama-dark/40">últimas 6</span>
            </div>
            <div class="flex h-32 items-end gap-2 border-b border-trama-sand-200">
              @for (w of d.weekly; track w.weekStart) {
                <div class="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span class="text-[10px] text-trama-dark/40">{{ w.profit ? shortMoney(w.profit) : '' }}</span>
                  <span class="w-full rounded-t bg-trama-green-700" [style.height.px]="weekHeight(w)"></span>
                </div>
              }
            </div>
            <div class="mt-2 flex gap-2">
              @for (w of d.weekly; track w.weekStart) {
                <span class="flex-1 text-center text-[10px] text-trama-dark/40">{{ weekLabel(w.weekStart) }}</span>
              }
            </div>
          </section>
        </div>
      </div>
    }
  `,
})
export class MerchantPanel {
  private readonly auth = inject(AuthService);
  private readonly reportsService = inject(ReportsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly payoutsService = inject(PayoutsService);
  private readonly money = inject(MoneyPipe);

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): ResumenState => ({ status: 'loaded', data })),
          startWith<ResumenState>({ status: 'loading', data: null }),
          catchError((): Observable<ResumenState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as ResumenState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly kpis = computed(() => {
    const d = this.data();
    if (!d) return [];
    const { current, previous } = d.summary;
    const money = (n: number): string => this.money.transform(n);
    return [
      { label: 'Ganancia', value: money(current.profit), ...this.delta(current.profit, previous.profit) },
      { label: 'Facturación', value: money(current.revenue), ...this.delta(current.revenue, previous.revenue) },
      { label: 'Vendidas', value: String(current.soldCount), ...this.delta(current.soldCount, previous.soldCount) },
      { label: 'Ticket promedio', value: money(current.avgTicket), ...this.delta(current.avgTicket, previous.avgTicket) },
    ];
  });

  protected retry(): void {
    this.reload.next();
  }

  protected catWidth(c: CategorySales): number {
    const max = Math.max(1, ...(this.data()?.categories ?? []).map((x) => x.merchantProfit));
    return c.merchantProfit ? Math.max(4, Math.round((c.merchantProfit / max) * 100)) : 0;
  }

  // Pixel height against the ~108px track, so the bars actually scale (a percentage would
  // resolve against the column's own auto height and collapse).
  protected weekHeight(w: WeeklyPoint): number {
    const max = Math.max(1, ...(this.data()?.weekly ?? []).map((x) => x.profit));
    return w.profit ? Math.max(4, Math.round((w.profit / max) * 108)) : 0;
  }

  protected weekLabel(weekStart: string): string {
    const [, m, day] = weekStart.split('-');
    return `${day}/${m}`;
  }

  protected shortMoney(n: number): string {
    return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  }

  private delta(current: number, previous: number): { delta: string | null; up: boolean } {
    if (previous === 0) return current > 0 ? { delta: 'nuevo', up: true } : { delta: null, up: true };
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0) return { delta: 'igual que el período anterior', up: true };
    return { delta: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs período anterior`, up: pct > 0 };
  }

  private load(): Observable<ResumenData> {
    const merchantId = this.auth.user()?.id ?? '';
    return forkJoin({
      summary: this.reportsService.summary(),
      categories: this.reportsService.byCategory(),
      weekly: this.reportsService.weekly(),
      proposals: this.proposalsService.pendingForMerchant(merchantId),
      payouts: this.payoutsService.monthlyByMerchant(merchantId),
      expiring: this.reportsService.expiring(EXPIRY_URGENT_DAYS),
    }).pipe(
      map(({ summary, categories, weekly, proposals, payouts, expiring }): ResumenData => {
        const overdue = payouts.filter((p) => p.status === 'overdue');
        const overdueAmount = overdue.reduce((sum, p) => sum + p.pendingAmount, 0);
        const urgencias: Urgencia[] = [];
        if (proposals.length) {
          urgencias.push({
            key: 'proposals',
            title: `${proposals.length} ${proposals.length === 1 ? 'propuesta para revisar' : 'propuestas para revisar'}`,
            meta: 'Cedentes esperando tu respuesta',
            actionLabel: 'Revisar',
            link: ['/m/proposal', proposals[0].id],
          });
        }
        if (overdue.length) {
          urgencias.push({
            key: 'overdue',
            title: `${overdue.length} ${overdue.length === 1 ? 'liquidación vencida' : 'liquidaciones vencidas'}`,
            meta: `${this.money.transform(overdueAmount)} pendiente`,
            actionLabel: 'Liquidar',
            link: ['/m/payouts'],
          });
        }
        if (expiring.length) {
          urgencias.push({
            key: 'expiring',
            title: `${expiring.length} ${expiring.length === 1 ? 'plazo por vencer' : 'plazos por vencer'}`,
            meta: `Próximos ${EXPIRY_URGENT_DAYS} días`,
            actionLabel: 'Ver',
            link: ['/m/reports'],
            fragment: 'rep-plazos',
          });
        }

        const topCategories = [...categories]
          .filter((c) => c.merchantProfit > 0)
          .sort((a, b) => b.merchantProfit - a.merchantProfit)
          .slice(0, 4);

        return {
          summary,
          categories: topCategories,
          weekly,
          urgencias,
          hasData: summary.current.soldCount > 0 || categories.some((c) => c.inStockCount > 0),
        };
      }),
    );
  }
}
