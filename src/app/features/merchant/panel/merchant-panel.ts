import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Garment } from '../../../core/models/garment.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { PayoutsService } from '../../../core/services/payouts.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';

interface ProposalRow {
  id: string;
  garmentName: string;
  photo?: string;
  consignorName: string;
  createdAt: Date;
  requested: number;
  calculated: number;
}

interface InventoryRow {
  id: string;
  name: string;
  category: string;
  photo?: string;
}

interface PanelData {
  pendingCount: number;
  stockCount: number;
  soldThisMonth: number;
  pendingPayout: number;
  proposals: ProposalRow[];
  inventory: InventoryRow[];
}

type PanelState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: PanelData };

@Component({
  selector: 'app-merchant-panel',
  imports: [RouterLink, StatCard, MoneyPipe, ShortDatePipe, LoadingSpinner, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar el panel." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <h1 class="font-display text-2xl font-semibold text-trama-dark">Panel</h1>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <app-stat-card title="Propuestas pendientes" [value]="d.pendingCount" />
          <app-stat-card title="Artículos en stock" [value]="d.stockCount" />
          <app-stat-card title="Vendidos del mes" [value]="d.soldThisMonth" />
          <app-stat-card title="Liquidación pendiente" [value]="d.pendingPayout | money" />
        </div>

        <div class="flex gap-2 border-b border-trama-sand-200">
          <button
            type="button"
            (click)="tab.set('proposals')"
            class="border-b-2 px-4 py-2 text-sm font-medium"
            [class]="
              tab() === 'proposals'
                ? 'border-trama-brand text-trama-dark'
                : 'border-transparent text-trama-dark/50'
            "
          >
            Propuestas
          </button>
          <button
            type="button"
            (click)="tab.set('inventory')"
            class="border-b-2 px-4 py-2 text-sm font-medium"
            [class]="
              tab() === 'inventory'
                ? 'border-trama-brand text-trama-dark'
                : 'border-transparent text-trama-dark/50'
            "
          >
            Inventario
          </button>
        </div>

        @if (tab() === 'proposals') {
          @if (d.proposals.length) {
            <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                  <tr>
                    <th class="px-4 py-3 font-medium">Prenda</th>
                    <th class="px-4 py-3 font-medium">Cedente</th>
                    <th class="px-4 py-3 font-medium">Fecha</th>
                    <th class="px-4 py-3 font-medium">Pide</th>
                    <th class="px-4 py-3 font-medium">Se vendería a</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of d.proposals; track row.id) {
                    <tr
                      [routerLink]="['/m/proposal', row.id]"
                      class="cursor-pointer border-b border-trama-sand-100 last:border-0 hover:bg-trama-sand-50"
                    >
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          @if (row.photo) {
                            <img [src]="row.photo" alt="" class="h-10 w-10 rounded-lg object-cover" />
                          } @else {
                            <div class="h-10 w-10 rounded-lg bg-trama-sand-100"></div>
                          }
                          <span class="font-medium text-trama-dark">{{ row.garmentName }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ row.consignorName }}</td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ row.createdAt | shortDate }}</td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ row.requested | money }}</td>
                      <td class="px-4 py-3 text-trama-dark/70">{{ row.calculated | money }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state message="No tenés propuestas pendientes." />
          }
        } @else {
          @if (d.inventory.length) {
            <div class="rounded-2xl border border-trama-sand-200 bg-white">
              <div class="divide-y divide-trama-sand-100">
                @for (item of d.inventory; track item.id) {
                  <a
                    [routerLink]="['/m/inventory', item.id]"
                    class="flex items-center gap-3 px-4 py-3 hover:bg-trama-sand-50"
                  >
                    @if (item.photo) {
                      <img [src]="item.photo" alt="" class="h-10 w-10 rounded-lg object-cover" />
                    } @else {
                      <div class="h-10 w-10 rounded-lg bg-trama-sand-100"></div>
                    }
                    <div>
                      <p class="font-medium text-trama-dark">{{ item.name }}</p>
                      <p class="text-xs text-trama-dark/50">{{ item.category }}</p>
                    </div>
                  </a>
                }
              </div>
              <div class="border-t border-trama-sand-100 px-4 py-3 text-sm">
                <a routerLink="/m/inventory" class="font-medium text-trama-brand">Ver todo</a>
              </div>
            </div>
          } @else {
            <app-empty-state message="Todavía no tenés artículos en stock." />
          }
        }
      </div>
    }
  `,
})
export class MerchantPanel {
  private readonly auth = inject(AuthService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly payoutsService = inject(PayoutsService);

  protected readonly tab = signal<'proposals' | 'inventory'>('proposals');

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
    const merchantId = this.auth.user()?.id ?? '';
    return forkJoin({
      proposals: this.proposalsService.pendingForMerchant(merchantId),
      garments: this.garmentsService.byMerchant(merchantId),
      consignors: this.consignorsService.list(),
      payouts: this.payoutsService.byMerchant(merchantId),
    }).pipe(
      map(({ proposals, garments, consignors, payouts }): PanelData => {
        const garmentById = new Map(garments.map((garment) => [garment.id, garment]));
        const consignorName = new Map(consignors.map((consignor) => [consignor.id, consignor.name]));
        const now = new Date();

        const proposalRows: ProposalRow[] = proposals.map((proposal) => {
          const garment = garmentById.get(proposal.garmentId);
          return {
            id: proposal.id,
            garmentName: garment?.name ?? '—',
            photo: garment?.photos[0],
            consignorName: garment ? (consignorName.get(garment.consignorId) ?? '—') : '—',
            createdAt: proposal.createdAt,
            requested: proposal.requestedConsignorPrice,
            calculated: proposal.calculatedSalePrice,
          };
        });

        const inventory: InventoryRow[] = garments
          .filter((garment) => garment.status === 'in_stock')
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
          .map((garment) => ({
            id: garment.id,
            name: garment.name,
            category: garment.category,
            photo: garment.photos[0],
          }));

        return {
          pendingCount: proposals.length,
          stockCount: garments.filter(
            (garment) => garment.status === 'in_stock' || garment.status === 'with_remarks',
          ).length,
          soldThisMonth: garments.filter((garment) => this.soldThisMonth(garment, now)).length,
          pendingPayout: payouts
            .filter((payout) => payout.status !== 'paid')
            .reduce((total, payout) => total + payout.totalAmount, 0),
          proposals: proposalRows,
          inventory,
        };
      }),
    );
  }

  private soldThisMonth(garment: Garment, now: Date): boolean {
    if (garment.status !== 'sold') return false;
    return garment.timeline.some(
      (event) =>
        event.status === 'sold' &&
        event.date.getMonth() === now.getMonth() &&
        event.date.getFullYear() === now.getFullYear(),
    );
  }
}
