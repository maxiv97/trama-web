import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CategorySales } from '../../../core/models/category-sales.model';
import { SummaryReport } from '../../../core/models/summary.model';
import { WeeklyPoint } from '../../../core/models/summary.model';
import { PayoutsService } from '../../../core/services/payouts.service';
import { ReportsService } from '../../../core/services/reports.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { Greeting } from '../../../shared/components/greeting/greeting';
import { BlobIcon } from '../../../shared/components/blob-icon/blob-icon';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { BarColumns, BarDatum, BarThin } from '../../../shared/components/charts/charts';
import { EnterDirective } from '../../../shared/directives/enter.directive';
import { BlobTone } from '../../../shared/icons/trama-icons';
import {
  Archive,
  Check,
  Clock,
  Inbox,
  LayoutDashboard,
  LucideIconData,
  PackageCheck,
  Receipt,
} from 'lucide-angular';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

interface Urgencia {
  key: string;
  title: string;
  meta: string;
  actionLabel: string;
  icon: LucideIconData;
  tone: BlobTone;
  link: unknown[];
  fragment?: string;
  queryParams?: Record<string, string>;
}

interface ResumenData {
  displayName: string;
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
  imports: [RouterLink, ErrorState, EmptyState, PageSkeleton, Greeting, BlobIcon, StatCard, BarThin, BarColumns, EnterDirective],
  providers: [MoneyPipe],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="dashboard" />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar el resumen. Revisá tu conexión e intentá de nuevo." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-9">
        <app-greeting eyebrow="Comercio · Panel" [name]="d.displayName" [summary]="greetingSummary()" />

        @if (!d.hasData) {
          <app-empty-state
            [appEnter]="1"
            [icon]="panelIcon"
            title="Todavía no hay ventas"
            message="Cuando se venda la primera prenda vas a ver acá tu ganancia, qué categorías rinden y a quién le debés."
          />
        }

        <!-- Qué hacer hoy -->
        <section class="space-y-3" [appEnter]="2">
          @if (d.urgencias.length) {
            <h2 class="text-title-3 text-trama-dark">Qué hacer hoy</h2>
            <div class="space-y-2.5">
              @for (u of d.urgencias; track u.key) {
                <div class="t-card flex items-center gap-4 px-4 py-3.5 sm:px-5">
                  <app-blob-icon [icon]="u.icon" [size]="42" [iconSize]="20" [tone]="u.tone" />
                  <div class="min-w-0 flex-1">
                    <p class="text-[15px] font-bold text-trama-dark">{{ u.title }}</p>
                    <p class="text-[13px] text-trama-body">{{ u.meta }}</p>
                  </div>
                  <a
                    [routerLink]="u.link"
                    [fragment]="u.fragment"
                    [queryParams]="u.queryParams"
                    class="shrink-0 t-btn t-btn-primary t-btn-sm"
                  >
                    {{ u.actionLabel }}
                  </a>
                </div>
              }
            </div>
          } @else {
            <div class="flex items-center gap-4 rounded-2xl bg-trama-green-50 px-5 py-4">
              <app-blob-icon [icon]="checkIcon" [size]="42" [iconSize]="20" tone="paper" iconColor="#2E7D54" />
              <div>
                <p class="font-display text-[17px] font-bold text-trama-dark">Todo al día</p>
                <p class="text-sm text-trama-body">No hay propuestas, vencimientos ni plazos urgentes.</p>
              </div>
            </div>
          }
        </section>

        <!-- El período en números -->
        <section class="space-y-3" [appEnter]="3">
          <h2 class="text-eyebrow">El mes en números</h2>
          <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            @for (kpi of kpis(); track kpi.label; let first = $first) {
              <app-stat-card
                [title]="kpi.label"
                [value]="kpi.value"
                [subtitle]="kpi.delta ?? 'sin período anterior'"
                [dark]="first"
              />
            }
          </div>
        </section>

        <div class="grid gap-5 lg:grid-cols-2" [appEnter]="4">
          <!-- Ganancia por categoría -->
          <section class="t-card p-6">
            <div class="mb-5 flex items-baseline justify-between gap-3">
              <h2 class="text-title-3 text-trama-dark">Ganancia por categoría</h2>
              <a routerLink="/m/reports" class="text-sm font-bold text-trama-brand hover:underline">Ver reporte</a>
            </div>
            @if (categoryBars().length) {
              <app-bar-thin [data]="categoryBars()" />
            } @else {
              <p class="text-sm text-trama-body">Sin ventas por categoría todavía.</p>
            }
          </section>

          <!-- Ganancia por semana -->
          <section class="t-card p-6">
            <div class="mb-5 flex items-baseline justify-between gap-3">
              <h2 class="text-title-3 text-trama-dark">Ganancia por semana</h2>
              <span class="text-[13px] text-trama-muted">últimas {{ d.weekly.length }}</span>
            </div>
            <app-bar-columns [data]="weeklyBars()" [height]="140" />
          </section>
        </div>
      </div>
    }
  `,
})
export class MerchantPanel {
  private readonly auth = inject(AuthService);
  private readonly reportsService = inject(ReportsService);
  private readonly payoutsService = inject(PayoutsService);
  private readonly money = inject(MoneyPipe);

  protected readonly panelIcon = LayoutDashboard;
  protected readonly checkIcon = Check;

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

  protected readonly greetingSummary = computed(() => {
    const n = this.data()?.urgencias.length ?? 0;
    if (!n) return 'Todo al día: no hay nada urgente para hoy.';
    return n === 1 ? 'Tenés 1 urgencia para hoy.' : `Tenés ${n} urgencias para hoy.`;
  });

  protected readonly categoryBars = computed<BarDatum[]>(() =>
    (this.data()?.categories ?? []).map((c) => ({
      label: c.category,
      value: c.merchantProfit,
      display: this.money.transform(c.merchantProfit),
    })),
  );

  protected readonly weeklyBars = computed<BarDatum[]>(() =>
    (this.data()?.weekly ?? []).map((w) => ({
      label: this.weekLabel(w.weekStart),
      value: w.profit,
      display: w.profit ? '$' + this.shortMoney(w.profit) : '$0',
    })),
  );

  protected retry(): void {
    this.reload.next();
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
      dashboard: this.reportsService.dashboard(),
      payouts: this.payoutsService.monthlyByMerchant(merchantId),
    }).pipe(
      map(({ dashboard, payouts }): ResumenData => {
        const overdue = payouts.filter((p) => p.status === 'overdue');
        const overdueAmount = overdue.reduce((sum, p) => sum + p.pendingAmount, 0);
        const urgencias: Urgencia[] = [];
        if (dashboard.pendingCount) {
          urgencias.push({
            key: 'proposals',
            title: `${dashboard.pendingCount} ${dashboard.pendingCount === 1 ? 'propuesta para revisar' : 'propuestas para revisar'}`,
            meta: 'Cedentes esperando tu respuesta',
            actionLabel: 'Revisar',
            icon: Inbox,
            tone: 'gold',
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
            icon: Receipt,
            tone: 'error',
            link: ['/m/payouts'],
          });
        }
        const pickup = dashboard.awaitingPickupCount ?? 0;
        if (pickup) {
          urgencias.push({
            key: 'pickup',
            title: `${pickup} ${pickup === 1 ? 'prenda no se vendió' : 'prendas no se vendieron'}`,
            meta: 'Sacalas de exhibición: el cedente las va a pasar a retirar',
            actionLabel: 'Ver',
            icon: PackageCheck,
            tone: 'warning',
            link: ['/m/inventory'],
            queryParams: { status: 'awaiting_pickup' },
          });
        }
        const unclaimed = dashboard.unclaimedPendingCount ?? 0;
        if (unclaimed) {
          urgencias.push({
            key: 'unclaimed',
            title: `${unclaimed} ${unclaimed === 1 ? 'prenda no retirada' : 'prendas no retiradas'}`,
            meta: 'Registrá el destino que les diste',
            actionLabel: 'Registrar',
            icon: Archive,
            tone: 'error',
            link: ['/m/inventory'],
            queryParams: { status: 'unclaimed' },
          });
        }
        if (dashboard.expiringCount) {
          urgencias.push({
            key: 'expiring',
            title: `${dashboard.expiringCount} ${dashboard.expiringCount === 1 ? 'plazo por vencer' : 'plazos por vencer'}`,
            meta: `Próximos ${EXPIRY_URGENT_DAYS} días`,
            actionLabel: 'Ver',
            icon: Clock,
            tone: 'warning',
            link: ['/m/reports'],
            fragment: 'rep-plazos',
          });
        }

        const topCategories = [...dashboard.categories]
          .filter((c) => c.merchantProfit > 0)
          .sort((a, b) => b.merchantProfit - a.merchantProfit)
          .slice(0, 4);

        return {
          displayName: dashboard.displayName || this.auth.user()?.name || '',
          summary: dashboard.summary,
          categories: topCategories,
          weekly: dashboard.weekly,
          urgencias,
          hasData:
            dashboard.summary.current.soldCount > 0 ||
            dashboard.categories.some((c) => c.inStockCount > 0),
        };
      }),
    );
  }
}
