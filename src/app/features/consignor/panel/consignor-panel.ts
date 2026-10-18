import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { GarmentStatus } from '../../../core/models/garment.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { PayoutsService } from '../../../core/services/payouts.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

interface GarmentRow {
  id: string;
  name: string;
  category: string;
  status: GarmentStatus;
  agreedSalePrice?: number;
  merchantName: string;
}

interface PanelData {
  activeCount: number;
  pendingCount: number;
  pendingPayout: number;
  totalPaidOut: number;
  rows: GarmentRow[];
}

type PanelState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: PanelData };

@Component({
  selector: 'app-consignor-panel',
  imports: [RouterLink, StatCard, StatusBadge, MoneyPipe, LoadingSpinner, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar tu panel." (retry)="retry()" />
    } @else if (data(); as data) {
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 class="font-display text-2xl font-semibold text-trama-dark">Mi panel</h1>
          <a
            routerLink="/c/upload"
            class="t-btn t-btn-primary"
            >Cargar artículo</a
          >
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <app-stat-card title="Artículos activos" [value]="data.activeCount" />
          <app-stat-card title="Pendientes de acuerdo" [value]="data.pendingCount" />
          <app-stat-card title="Liquidación pendiente" [value]="data.pendingPayout | money" />
          <app-stat-card title="Total liquidado" [value]="data.totalPaidOut | money" />
        </div>

        @if (data.rows.length) {
          <div class="t-card overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Prenda</th>
                  <th class="px-4 py-3 font-medium">Categoría</th>
                  <th class="px-4 py-3 font-medium">Estado</th>
                  <th class="px-4 py-3 font-medium">Precio acordado</th>
                  <th class="px-4 py-3 font-medium">Comercio</th>
                </tr>
              </thead>
              <tbody>
                @for (row of data.rows; track row.id) {
                  <tr
                    [routerLink]="['/c/garment', row.id]"
                    class="cursor-pointer border-b border-trama-sand-100 last:border-0 hover:bg-trama-sand-50"
                  >
                    <td class="px-4 py-3 font-medium text-trama-dark">{{ row.name }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.category }}</td>
                    <td class="px-4 py-3"><app-status-badge [status]="row.status" /></td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.agreedSalePrice | money }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.merchantName }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-empty-state
            message="Todavía no cargaste ninguna prenda."
            link="/c/upload"
            linkLabel="Cargá tu primera prenda"
          />
        }
      </div>
    }
  `,
})
export class ConsignorPanel {
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

  protected retry(): void {
    this.reload.next();
  }

  private load(): Observable<PanelData> {
    const consignorId = this.auth.user()?.id ?? '';
    return forkJoin({
      garments: this.garmentsService.byConsignor(consignorId),
      payouts: this.payoutsService.byConsignor(consignorId),
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
          pendingPayout: payouts
            .filter((payout) => payout.status !== 'paid')
            .reduce((total, payout) => total + payout.totalAmount, 0),
          totalPaidOut: payouts
            .filter((payout) => payout.status === 'paid')
            .reduce((total, payout) => total + payout.totalAmount, 0),
          rows,
        };
      }),
    );
  }
}
