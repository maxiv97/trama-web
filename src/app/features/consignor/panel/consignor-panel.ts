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
  imports: [RouterLink, StatCard, StatusBadge, MoneyPipe],
  template: `
    @if (isLoading()) {
      <div class="flex min-h-[60vh] items-center justify-center">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-trama-sand-200 border-t-trama-brand"
        ></div>
      </div>
    } @else if (isError()) {
      <div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p class="text-trama-dark/70">No pudimos cargar tu panel.</p>
        <button
          type="button"
          (click)="retry()"
          class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
        >
          Reintentar
        </button>
      </div>
    } @else if (data(); as data) {
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-semibold text-trama-dark">Mi panel</h1>
          <a
            routerLink="/c/upload"
            class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
            >Cargar artículo</a
          >
        </div>

        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <app-stat-card title="Artículos activos" [value]="data.activeCount" />
          <app-stat-card title="Pendientes de acuerdo" [value]="data.pendingCount" />
          <app-stat-card title="Liquidación pendiente" [value]="data.pendingPayout | money" />
          <app-stat-card title="Total liquidado" [value]="data.totalPaidOut | money" />
        </div>

        @if (data.rows.length) {
          <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
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
          <div
            class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-trama-sand-200 py-16 text-center"
          >
            <p class="text-trama-dark/70">Todavía no cargaste ninguna prenda.</p>
            <a
              routerLink="/c/upload"
              class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
              >Cargá tu primera prenda</a
            >
          </div>
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
