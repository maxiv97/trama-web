import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import {
  ALL,
  EMPTY_FILTERS,
  ProposalFilters,
  StatusFilter,
  consignorOptions,
  filterProposalRows,
  parseStatusFilter,
  salesPointOptions,
} from './proposal-filters';
import {
  PROPOSAL_STATUSES,
  ProposalRow,
  buildProposalRows,
  proposalLink,
  summarizeProposals,
} from './proposal-rows';

type ProposalsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; rows: ProposalRow[] };

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: ALL, label: 'Todos los estados' },
  { value: 'under_review', label: 'Por revisar' },
  { value: 'counteroffer', label: 'Esperando al cedente' },
  { value: 'no_agreement', label: 'Sin acuerdo' },
  { value: 'cancelled', label: 'Canceladas' },
];

@Component({
  selector: 'app-merchant-proposals',
  imports: [
    LoadingSpinner,
    ErrorState,
    EmptyState,
    StatusBadge,
    MoneyPipe,
    ShortDatePipe,
    StatCard,
    RouterLink,
  ],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar las propuestas." (retry)="retry()" />
    } @else if (rows(); as rows) {
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold text-trama-dark">Propuestas</h1>

        @if (summary().toReview > 0 && filters().status !== 'under_review') {
          <button
            type="button"
            (click)="setFilter('status', 'under_review')"
            class="flex w-full items-center justify-between rounded-2xl bg-status-pending-soft px-5 py-3 text-left text-sm hover:brightness-95"
          >
            <span class="font-medium text-trama-dark">
              Tenés {{ summary().toReview }}
              {{ summary().toReview === 1 ? 'propuesta para revisar' : 'propuestas para revisar' }}
            </span>
            <span class="font-medium text-trama-brand">Ver</span>
          </button>
        }

        @if (rows.length) {
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <app-stat-card title="Por revisar" [value]="summary().toReview" />
            <app-stat-card title="Esperando al cedente" [value]="summary().waitingConsignor" />
            <app-stat-card
              title="Valor de venta por revisar"
              [value]="summary().toReviewSaleValue | money"
            />
          </div>
        }

        @if (rows.length) {
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="search"
              [value]="filters().search"
              (input)="setFilter('search', $any($event.target).value)"
              placeholder="Buscar por prenda"
              class="rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
            />
            <select
              (change)="setFilter('status', $any($event.target).value)"
              class="rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
            >
              @for (option of statusOptions; track option.value) {
                <option [value]="option.value" [selected]="filters().status === option.value">
                  {{ option.label }}
                </option>
              }
            </select>
            <select
              (change)="setFilter('consignorId', $any($event.target).value)"
              class="rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
            >
              <option [value]="all" [selected]="filters().consignorId === all">
                Todos los cedentes
              </option>
              @for (option of consignors(); track option.id) {
                <option [value]="option.id" [selected]="filters().consignorId === option.id">
                  {{ option.name }}
                </option>
              }
            </select>
            <select
              (change)="setFilter('salesPointId', $any($event.target).value)"
              class="rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
            >
              <option [value]="all" [selected]="filters().salesPointId === all">
                Todos los puntos de venta
              </option>
              @for (option of salesPoints(); track option.id) {
                <option [value]="option.id" [selected]="filters().salesPointId === option.id">
                  {{ option.name }}
                </option>
              }
            </select>
          </div>
        }

        @if (filteredRows().length) {
          <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Prenda</th>
                  <th class="px-4 py-3 font-medium">Categoría</th>
                  <th class="px-4 py-3 font-medium">Cedente</th>
                  <th class="px-4 py-3 font-medium">Punto de venta</th>
                  <th class="px-4 py-3 font-medium">Estado</th>
                  <th class="px-4 py-3 font-medium">Para el cedente</th>
                  <th class="px-4 py-3 font-medium">Precio de venta</th>
                  <th class="px-4 py-3 font-medium">Fecha</th>
                  <th class="px-4 py-3"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.garmentId) {
                  <tr
                    [routerLink]="linkTo(row)"
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
                          [routerLink]="linkTo(row)"
                          class="inline-block rounded-lg bg-trama-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-trama-green-700"
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
        } @else if (rows.length) {
          <div class="space-y-3 text-center">
            <app-empty-state message="No hay propuestas que coincidan con los filtros." />
            <button
              type="button"
              (click)="clearFilters()"
              class="text-sm font-medium text-trama-brand hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        } @else {
          <app-empty-state message="Todavía no recibiste propuestas de cedentes." />
        }
      </div>
    }
  `,
})
export class MerchantProposals {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);

  protected readonly all = ALL;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly linkTo = proposalLink;

  protected readonly filters = signal<ProposalFilters>(this.filtersFromUrl());

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.loadRows().pipe(
          map((rows): ProposalsState => ({ status: 'loaded', rows })),
          startWith<ProposalsState>({ status: 'loading' }),
          catchError(() => of<ProposalsState>({ status: 'error' })),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as ProposalsState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly rows = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.rows : null;
  });

  protected readonly filteredRows = computed(() =>
    filterProposalRows(this.rows() ?? [], this.filters()),
  );
  protected readonly consignors = computed(() => consignorOptions(this.rows() ?? []));
  protected readonly salesPoints = computed(() => salesPointOptions(this.rows() ?? []));
  protected readonly summary = computed(() => summarizeProposals(this.rows() ?? []));

  protected setFilter<K extends keyof ProposalFilters>(key: K, value: ProposalFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  protected clearFilters(): void {
    this.filters.set(EMPTY_FILTERS);
  }

  protected retry(): void {
    this.reload.next();
  }

  private filtersFromUrl(): ProposalFilters {
    const params = this.route.snapshot.queryParamMap;
    return {
      ...EMPTY_FILTERS,
      status: parseStatusFilter(params.get('status')),
      consignorId: params.get('consignor') ?? ALL,
    };
  }

  private loadRows(): Observable<ProposalRow[]> {
    const merchantId = this.auth.user()?.id ?? '';

    return forkJoin({
      garments: this.garmentsService.byMerchant(merchantId),
      proposals: this.proposalsService.proposalsForMerchant(PROPOSAL_STATUSES),
      consignors: this.consignorsService.list(),
      merchant: this.merchantsService.getById(merchantId),
    }).pipe(
      map(({ garments, proposals, consignors, merchant }) =>
        buildProposalRows(
          garments,
          new Map(proposals.map((proposal) => [proposal.garmentId, proposal])),
          new Map(consignors.map((consignor) => [consignor.id, consignor.name])),
          new Map(merchant.salesPoints.map((point) => [point.id, point.name])),
        ),
      ),
    );
  }
}
