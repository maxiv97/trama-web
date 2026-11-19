import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';
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
import { LayoutDashboard } from 'lucide-angular';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { BarList } from '../../../shared/components/charts/bar-list';
import { ColumnChart } from '../../../shared/components/charts/column-chart';
import { ChartPoint } from '../../../shared/components/charts/chart-point';
import { greetingFor, greetingName } from '../../../shared/utils/greeting';

interface Urgencia {
  key: string;
  title: string;
  meta: string;
  actionLabel: string;
  link: unknown[];
  queryParams?: Record<string, string>;
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
  imports: [
    RouterLink,
    LoadingSpinner,
    ErrorState,
    EmptyState,
    PageHeader,
    StatCard,
    BarList,
    ColumnChart,
  ],
  providers: [MoneyPipe],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar el resumen." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="trama-enter space-y-8">
        <app-page-header
          eyebrow="Comercio"
          [icon]="panelIcon"
          tone="sage"
          [title]="greeting()"
          [stitched]="true"
        />

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
                <div
                  class="flex items-center gap-3 border-b border-trama-sand-100 px-4 py-3 last:border-0"
                >
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-trama-gold"></span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-trama-dark">{{ u.title }}</p>
                    <p class="text-xs text-trama-dark/50">{{ u.meta }}</p>
                  </div>
                  <a
                    [routerLink]="u.link"
                    [queryParams]="u.queryParams"
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
                <p class="text-sm text-trama-dark/50">
                  No hay propuestas, vencimientos ni plazos urgentes.
                </p>
              </div>
            </div>
          }
        </section>

        <!-- El período en números -->
        <section class="space-y-3">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-trama-dark/40">
            El mes en números
          </h2>
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            @for (kpi of kpis(); track kpi.label; let first = $first) {
              <app-stat-card
                [featured]="first"
                [title]="kpi.label"
                [value]="kpi.value"
                [subtitle]="kpi.delta ?? 'sin período anterior'"
              />
            }
          </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-2">
          <section class="trama-card space-y-4">
            <div class="flex items-baseline justify-between gap-3">
              <h2 class="trama-title-3 text-trama-dark">¿Qué categorías dejan más ganancia?</h2>
              <a routerLink="/m/reports" class="trama-link">Ver reporte</a>
            </div>
            @if (categoryPoints().length) {
              <app-bar-list thin [points]="categoryPoints()" />
            } @else {
              <p class="trama-body text-trama-muted">Sin ventas por categoría todavía.</p>
            }
          </section>

          <section class="trama-card space-y-4">
            <div class="flex items-baseline justify-between gap-3">
              <h2 class="trama-title-3 text-trama-dark">¿Cómo viene la ganancia por semana?</h2>
              <span class="text-sm text-trama-muted">últimas 6</span>
            </div>
            <app-column-chart [points]="weekPoints()" />
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

  protected readonly panelIcon = LayoutDashboard;
  protected readonly greeting = computed(
    () => `${greetingFor()}, ${greetingName(this.auth.user()?.name ?? '', 'merchant')}`,
  );

  protected readonly categoryPoints = computed<ChartPoint[]>(() =>
    (this.data()?.categories ?? []).map((c, i) => ({
      label: c.category,
      value: c.merchantProfit,
      display: this.money.transform(c.merchantProfit),
      tone: i === 0 ? 'highlight' : 'secondary',
    })),
  );

  // Le damos mas importancia a la semana actual
  protected readonly weekPoints = computed<ChartPoint[]>(() => {
    const weeks = this.data()?.weekly ?? [];
    return weeks.map((w, i) => ({
      label: this.weekLabel(w.weekStart),
      value: w.profit,
      display: `$${this.shortMoney(w.profit)}`,
      tone: i === weeks.length - 1 ? 'highlight' : 'main',
    }));
  });

  protected readonly kpis = computed(() => {
    const d = this.data();
    if (!d) return [];
    const { current, previous } = d.summary;
    const money = (n: number): string => this.money.transform(n);
    return [
      {
        label: 'Ganancia',
        value: money(current.profit),
        ...this.delta(current.profit, previous.profit),
      },
      {
        label: 'Facturación',
        value: money(current.revenue),
        ...this.delta(current.revenue, previous.revenue),
      },
      {
        label: 'Vendidas',
        value: String(current.soldCount),
        ...this.delta(current.soldCount, previous.soldCount),
      },
      {
        label: 'Ticket promedio',
        value: money(current.avgTicket),
        ...this.delta(current.avgTicket, previous.avgTicket),
      },
    ];
  });

  protected retry(): void {
    this.reload.next();
  }

  private weekLabel(weekStart: string): string {
    const [, m, day] = weekStart.split('-');
    return `${day}/${m}`;
  }

  private shortMoney(n: number): string {
    return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  }

  private delta(current: number, previous: number): { delta: string | null; up: boolean } {
    if (previous === 0)
      return current > 0 ? { delta: 'nuevo', up: true } : { delta: null, up: true };
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
            link: ['/m/proposals'],
            queryParams: { status: 'under_review' },
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
