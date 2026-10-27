import { ChevronRight, LucideAngularModule, Shirt } from 'lucide-angular';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Agreement } from '../../../core/models/agreement.model';
import { Garment, GarmentStatus } from '../../../core/models/garment.model';
import { countdownLabel, daysUntil } from '../../../core/utils/deadline.util';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { AgreementsService } from '../../../core/services/agreements.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { PayoutsService } from '../../../core/services/payouts.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { Greeting } from '../../../shared/components/greeting/greeting';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { EnterDirective } from '../../../shared/directives/enter.directive';
import { ChipOption, DataTable, pageOf, PersonCell, TableThumb } from '../../../shared/components/data-table/data-table';

interface GarmentRow {
  id: string;
  name: string;
  photo?: string;
  category: string;
  status: GarmentStatus;
  agreedSalePrice?: number;
  merchantName: string;
}

// Prendas con un plazo que requiere acción del cedente: retirar o entregar.
interface UrgentItem {
  id: string;
  name: string;
  kind: 'pickup' | 'delivery';
  deadline: Date;
}

// Las entregas se destacan cuando faltan 3 días o menos; los retiros, siempre.
const DELIVERY_SOON_DAYS = 3;

interface PanelData {
  activeCount: number;
  pendingCount: number;
  counterCount: number;
  pendingPayout: number;
  totalPaidOut: number;
  rows: GarmentRow[];
  urgent: UrgentItem[];
}

type PanelState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: PanelData };

@Component({
  selector: 'app-consignor-panel',
  imports: [LucideAngularModule, PersonCell, TableThumb, DataTable, EnterDirective, PageSkeleton, Greeting, RouterLink, StatCard, StatusBadge, MoneyPipe, ErrorState, EmptyState, ShortDatePipe],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="dashboard" />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar tu panel." (retry)="retry()" />
    } @else if (data(); as data) {
      <div class="space-y-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <app-greeting eyebrow="Cedente · Mi panel" [name]="firstName()" [summary]="greetingSummary()" />
          <a routerLink="/c/upload" class="t-btn t-btn-primary" [appEnter]="2">Cargar prenda</a>
        </div>

        @if (data.urgent.length) {
          <section class="space-y-2 rounded-2xl border border-status-pending/30 bg-status-pending-soft p-5" [appEnter]="3" aria-label="Plazos">
            <h2 class="text-[15px] font-bold text-trama-dark">Tenés plazos por cumplir</h2>
            <ul class="divide-y divide-status-pending/15">
              @for (item of data.urgent; track item.id) {
                <li>
                  <a class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" [routerLink]="['/c/garment', item.id]">
                    <span class="text-trama-body">
                      {{ item.kind === 'pickup' ? 'Retirá' : 'Entregá' }}
                      <span class="font-semibold text-trama-dark">{{ item.name }}</span>
                      antes del {{ item.deadline | shortDate }}
                    </span>
                    <span class="rounded-full bg-trama-paper px-2.5 py-0.5 text-[12px] font-semibold text-status-pending">{{ countdown(item.deadline) }}</span>
                  </a>
                </li>
              }
            </ul>
          </section>
        }

        <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4" [appEnter]="3">
          <app-stat-card title="Prendas activas" [value]="data.activeCount" [dark]="true" />
          <app-stat-card title="Pendientes de acuerdo" [value]="data.pendingCount" />
          <app-stat-card title="Liquidación pendiente" [value]="data.pendingPayout | money" />
          <app-stat-card title="Total liquidado" [value]="data.totalPaidOut | money" />
        </div>

        @if (data.rows.length) {
          <section class="space-y-3" [appEnter]="4">
            <h2 class="text-title-3 text-trama-dark">Mis prendas</h2>
            <app-data-table [total]="data.rows.length" [shown]="pageRows().length" noun="prendas" [(page)]="page">
              <table class="t-table">
                <thead>
                  <tr>
                    <th>Prenda</th>
                    <th>Comercio</th>
                    <th>Estado</th>
                    <th class="t-num">Precio acordado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of pageRows(); track row.id) {
                    <tr class="t-row-link" [routerLink]="['/c/garment', row.id]">
                      <td class="t-cell-main">
                        <div class="flex items-center gap-3">
                          <app-table-thumb [garmentId]="row.id" [seed]="row.id" />
                          <span class="min-w-0 max-w-[280px]">
                            <span class="block truncate font-bold">{{ row.name }}</span>
                            <span class="t-meta">{{ row.category }}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label="Comercio"><app-person-cell kind="merchant" [name]="row.merchantName" /></td>
                      <td data-label="Estado"><app-status-badge [status]="row.status" /></td>
                      <td data-label="Precio acordado" class="t-num t-amount">{{ row.agreedSalePrice | money }}</td>
                      <td class="t-chev"><lucide-angular [img]="chevIcon" [size]="18" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            </app-data-table>
          </section>
        } @else {
          <app-empty-state
            [icon]="shirtIcon"
            title="Todavía no hay prendas acá"
            message="Cargá una prenda, elegí el comercio y seguí desde acá cada paso hasta que la cobres."
            link="/c/upload"
            linkLabel="Cargar prenda"
          />
        }
      </div>
    }
  `,
})
export class ConsignorPanel {
  protected readonly page = signal(0);
  protected readonly pageRows = computed(() => pageOf(this.data()?.rows ?? [], this.page()));
  protected readonly shirtIcon = Shirt;
  protected readonly chevIcon = ChevronRight;
  private readonly auth = inject(AuthService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly payoutsService = inject(PayoutsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly agreementsService = inject(AgreementsService);

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): PanelState => ({ status: 'loaded', data })),
          startWith<PanelState>({ status: 'loading', data: null }),
          catchError((): Observable<PanelState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as PanelState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly firstName = computed(() => (this.auth.user()?.name ?? '').split(' ')[0]);

  protected readonly greetingSummary = computed(() => {
    const d = this.data();
    if (!d) return '';
    const pickups = d.urgent.filter((item) => item.kind === 'pickup').length;
    if (pickups) {
      return pickups === 1 ? 'Tenés 1 prenda para retirar.' : `Tenés ${pickups} prendas para retirar.`;
    }
    if (d.counterCount) {
      return d.counterCount === 1
        ? 'Tenés 1 contraoferta para responder.'
        : `Tenés ${d.counterCount} contraofertas para responder.`;
    }
    if (d.pendingCount) {
      return d.pendingCount === 1
        ? '1 prenda está esperando la respuesta del comercio.'
        : `${d.pendingCount} prendas están esperando la respuesta del comercio.`;
    }
    return d.rows.length ? 'Todo al día: no hay nada pendiente de tu lado.' : 'Cargá tu primera prenda para empezar.';
  });

  protected countdown(deadline: Date): string {
    return countdownLabel(deadline);
  }

  protected retry(): void {
    this.reload.next();
  }

  private urgentItems(garments: Garment[], agreements: Agreement[]): UrgentItem[] {
    const byGarment = new Map(agreements.map((agreement) => [agreement.garmentId, agreement]));
    const items: UrgentItem[] = [];
    for (const garment of garments) {
      const agreement = byGarment.get(garment.id);
      if (garment.status === 'awaiting_pickup' && agreement?.pickupDeadline) {
        items.push({ id: garment.id, name: garment.name, kind: 'pickup', deadline: agreement.pickupDeadline });
      }
      if (
        (garment.status === 'agreed' || garment.status === 'rejected') &&
        agreement?.deliveryDeadline &&
        daysUntil(agreement.deliveryDeadline) <= DELIVERY_SOON_DAYS
      ) {
        items.push({ id: garment.id, name: garment.name, kind: 'delivery', deadline: agreement.deliveryDeadline });
      }
    }
    return items.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }

  private load(): Observable<PanelData> {
    const consignorId = this.auth.user()?.id ?? '';
    return forkJoin({
      garments: this.garmentsService.listMeta(),
      payouts: this.payoutsService.monthlyByConsignor(consignorId),
      merchants: this.merchantsService.list(),
      agreements: this.agreementsService.list(),
    }).pipe(
      map(({ garments, payouts, merchants, agreements }): PanelData => {
        const rows: GarmentRow[] = garments.map((garment) => ({
          id: garment.id,
          name: garment.name,
          category: garment.category,
          status: garment.status,
          agreedSalePrice: agreements.find((agreement) => agreement.garmentId === garment.id)
            ?.agreedSalePrice,
          merchantName:
            merchants.find((merchant) => merchant.id === garment.merchantId)?.businessName ?? '—',
        }));

        return {
          activeCount: garments.filter(
            (garment) => garment.status === 'in_stock' || garment.status === 'with_remarks',
          ).length,
          pendingCount: garments.filter(
            (garment) => garment.status === 'under_review' || garment.status === 'counteroffer',
          ).length,
          counterCount: garments.filter((garment) => garment.status === 'counteroffer').length,
          // Se suma por prenda y no por mes: un mes puede tener prendas ya cobradas y otras
          // pendientes, y su estado recién pasa a "paid" cuando se cobraron todas.
          pendingPayout: payouts.reduce((total, payout) => total + payout.pendingAmount, 0),
          totalPaidOut: payouts.reduce((total, payout) => total + payout.paidAmount, 0),
          rows,
          urgent: this.urgentItems(garments, agreements),
        };
      }),
    );
  }
}
