import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { Garment, GarmentStatus } from '../../../core/models/garment.model';
import { Proposal } from '../../../core/models/proposal.model';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { buildProposalRows, PROPOSAL_STATUSES, ProposalRow } from './proposal-rows';

type StatusFilter = 'all' | GarmentStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'under_review', label: 'Por revisar' },
  { value: 'counteroffer', label: 'Contraoferta enviada' },
  { value: 'no_agreement', label: 'Sin acuerdo' },
  { value: 'cancelled', label: 'Canceladas' },
];

interface FilterOption {
  id: string;
  name: string;
}

interface ProposalsData {
  rows: ProposalRow[];
  toReviewCount: number;
  counterofferCount: number;
  toReviewValue: number;
  consignors: FilterOption[];
  salesPoints: FilterOption[];
}

type ProposalsState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ProposalsData };

@Component({
  selector: 'app-merchant-proposals',
  imports: [
    RouterLink,
    StatCard,
    StatusBadge,
    MoneyPipe,
    ShortDatePipe,
    LoadingSpinner,
    ErrorState,
    EmptyState,
  ],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar las propuestas." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold text-trama-dark">Propuestas</h1>

        @if (d.toReviewCount > 0 && statusFilter() !== 'under_review') {
          <button
            type="button"
            (click)="statusFilter.set('under_review')"
            class="flex w-full items-center justify-between rounded-2xl border border-status-pending/20 bg-status-pending-soft px-5 py-3 text-left hover:brightness-95"
          >
            <span class="text-sm font-medium text-trama-dark">
              {{ d.toReviewCount }}
              {{ d.toReviewCount === 1 ? 'propuesta para revisar' : 'propuestas para revisar' }}
            </span>
            <span class="text-sm font-medium text-trama-brand">Ver</span>
          </button>
        }

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <app-stat-card title="Por revisar" [value]="d.toReviewCount" />
          <app-stat-card title="Esperando al cedente" [value]="d.counterofferCount" />
          <app-stat-card title="Valor de venta en revisión" [value]="d.toReviewValue | money" />
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
            placeholder="Buscar por nombre"
            class="t-input"
          />
          <select
            [value]="statusFilter()"
            (change)="statusFilter.set($any($event.target).value)"
            class="t-input"
          >
            @for (option of statusFilters; track option.value) {
              <option [value]="option.value" [selected]="statusFilter() === option.value">
                {{ option.label }}
              </option>
            }
          </select>
          <select
            [value]="consignorFilter()"
            (change)="consignorFilter.set($any($event.target).value)"
            class="t-input"
          >
            <option value="all" [selected]="consignorFilter() === 'all'">Todos los cedentes</option>
            @for (option of d.consignors; track option.id) {
              <option [value]="option.id" [selected]="consignorFilter() === option.id">
                {{ option.name }}
              </option>
            }
          </select>
          <select
            [value]="salesPointFilter()"
            (change)="salesPointFilter.set($any($event.target).value)"
            class="t-input"
          >
            <option value="all">Todos los puntos</option>
            @for (option of d.salesPoints; track option.id) {
              <option [value]="option.id">{{ option.name }}</option>
            }
          </select>
        </div>

        @if (filteredRows().length) {
          <div class="t-card overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Prenda</th>
                  <th class="px-4 py-3 font-medium">Categoría</th>
                  <th class="px-4 py-3 font-medium">Cedente</th>
                  <th class="px-4 py-3 font-medium">Punto de venta</th>
                  <th class="px-4 py-3 font-medium">Estado</th>
                  <th class="px-4 py-3 font-medium">Para el cedente</th>
                  <th class="px-4 py-3 font-medium">Precio venta</th>
                  <th class="px-4 py-3 font-medium">Fecha</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.garmentId) {
                  <tr
                    (click)="open(row)"
                    class="cursor-pointer border-b border-trama-sand-100 last:border-0 hover:bg-trama-sand-50"
                  >
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        @if (row.photo) {
                          <img [src]="row.photo" alt="" class="h-10 w-10 rounded-lg object-cover" />
                        } @else {
                          <div class="h-10 w-10 rounded-lg bg-trama-sand-100"></div>
                        }
                        <span class="font-medium text-trama-dark">{{ row.name }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.category }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.consignorName }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.salesPointName }}</td>
                    <td class="px-4 py-3"><app-status-badge [status]="row.status" /></td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.consignorPrice | money }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.salePrice | money }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.createdAt | shortDate }}</td>
                    <td class="px-4 py-3 text-right">
                      @if (row.status === 'under_review' && row.proposalId) {
                        <a
                          [routerLink]="['/m/proposal', row.proposalId]"
                          (click)="$event.stopPropagation()"
                          class="t-btn t-btn-primary t-btn-sm"
                        >
                          Revisar
                        </a>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (d.rows.length) {
          <app-empty-state message="No hay propuestas que coincidan con los filtros." />
        } @else {
          <app-empty-state message="Todavía no recibiste propuestas de cedentes." />
        }
      </div>
    }
  `,
})
export class MerchantProposals {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);

  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>(this.initialStatusFilter());
  protected readonly consignorFilter = signal(
    this.route.snapshot.queryParamMap.get('consignor') ?? 'all',
  );
  protected readonly salesPointFilter = signal('all');

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): ProposalsState => ({ status: 'loaded', data })),
          startWith<ProposalsState>({ status: 'loading', data: null }),
          catchError((): Observable<ProposalsState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as ProposalsState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly filteredRows = computed(() => {
    const d = this.data();
    if (!d) return [];
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const consignor = this.consignorFilter();
    const salesPoint = this.salesPointFilter();
    return d.rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false;
      if (consignor !== 'all' && row.consignorId !== consignor) return false;
      if (salesPoint !== 'all' && row.salesPointId !== salesPoint) return false;
      if (term && !row.name.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  protected retry(): void {
    this.reload.next();
  }

  /** Proposals awaiting the merchant open the review screen; the rest, the garment tracking. */
  protected open(row: ProposalRow): void {
    if (row.status === 'under_review' && row.proposalId) {
      this.router.navigate(['/m/proposal', row.proposalId]);
    } else {
      this.router.navigate(['/m/garment', row.garmentId]);
    }
  }

  private initialStatusFilter(): StatusFilter {
    const status = this.route.snapshot.queryParamMap.get('status');
    return STATUS_FILTERS.some((option) => option.value === status)
      ? (status as StatusFilter)
      : 'all';
  }

  private load(): Observable<ProposalsData> {
    const merchantId = this.auth.user()?.id ?? '';
    return forkJoin({
      garments: this.garmentsService.byMerchant(merchantId),
      pending: this.proposalsService.pendingForMerchant(merchantId),
      consignors: this.consignorsService.list(),
      merchant: this.merchantsService.getById(merchantId),
    }).pipe(
      switchMap(({ garments, pending, consignors, merchant }) =>
        this.closedProposals(garments).pipe(
          map((closed): ProposalsData => {
            // `pendingForMerchant` only returns `under_review`; the other stages are fetched per garment.
            const proposalByGarment = new Map(
              [...pending, ...closed].map((proposal) => [proposal.garmentId, proposal]),
            );
            const rows = buildProposalRows(
              garments,
              proposalByGarment,
              new Map(consignors.map((consignor) => [consignor.id, consignor.name])),
              new Map((merchant?.salesPoints ?? []).map((point) => [point.id, point.name])),
            );

            const toReview = rows.filter((row) => row.status === 'under_review');
            const usedConsignors = new Set(rows.map((row) => row.consignorId));
            const usedSalesPoints = new Set(
              rows.map((row) => row.salesPointId).filter((id): id is string => !!id),
            );

            return {
              rows,
              toReviewCount: toReview.length,
              counterofferCount: rows.filter((row) => row.status === 'counteroffer').length,
              toReviewValue: toReview.reduce((total, row) => total + (row.salePrice ?? 0), 0),
              consignors: consignors
                .filter((consignor) => usedConsignors.has(consignor.id))
                .map((consignor) => ({ id: consignor.id, name: consignor.name })),
              salesPoints: (merchant?.salesPoints ?? [])
                .filter((point) => usedSalesPoints.has(point.id))
                .map((point) => ({ id: point.id, name: point.name })),
            };
          }),
        ),
      ),
    );
  }

  /** Proposals of the garments past `under_review` (counteroffer, no agreement, cancelled). */
  private closedProposals(garments: Garment[]): Observable<Proposal[]> {
    const ids = garments
      .filter((garment) => garment.status !== 'under_review')
      .filter((garment) => PROPOSAL_STATUSES.includes(garment.status))
      .map((garment) => garment.id);
    // forkJoin([]) completes without emitting, so an empty list short-circuits.
    if (!ids.length) return of([]);
    return forkJoin(
      ids.map((id) => this.proposalsService.byGarment(id).pipe(catchError(() => of(undefined)))),
    ).pipe(map((proposals) => proposals.filter((proposal): proposal is Proposal => !!proposal)));
  }
}
