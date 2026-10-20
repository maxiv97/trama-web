import { Inbox, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { FilterSheet } from '../../../shared/components/filter-sheet/filter-sheet';
import { Component, computed, inject, signal, linkedSignal } from '@angular/core';
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
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';
import { buildProposalRows, PROPOSAL_STATUSES, ProposalRow } from './proposal-rows';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { ChipOption, DataTable, FilterChips, pageOf, PersonCell, SearchField, TableThumb } from '../../../shared/components/data-table/data-table';
import { Dropdown, DropdownOption } from '../../../shared/components/dropdown/dropdown';

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
  imports: [FilterSheet, LucideAngularModule, Dropdown, PersonCell, TableThumb, SearchField, FilterChips, DataTable, PageSkeleton, PageHeader, 
    RouterLink,
    StatCard,
    StatusBadge,
    MoneyPipe,
    ShortDatePipe,
    ErrorState,
    EmptyState,
  ],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="table" />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar las propuestas." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <app-page-header title="Propuestas" section="Propuestas" [icon]="headerIcon" lead="Lo que te ofrecen los cedentes. Aceptá, contraofertá o rechazá cada prenda." />

        <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 [&>:first-child]:col-span-2 md:[&>:first-child]:col-span-1">
          <app-stat-card title="Por revisar" [value]="d.toReviewCount" [highlight]="true" />
          <app-stat-card title="Esperando al cedente" [value]="d.counterofferCount" />
          <app-stat-card title="Valor de venta en revisión" [value]="d.toReviewValue | money" />
        </div>

        @if (d.rows.length) {
          <app-data-table [total]="filteredRows().length" [shown]="pageRows().length" noun="propuestas" [(page)]="page">
            <div toolbar class="hidden w-full sm:block">
              <app-filter-chips [options]="statusChips()" [(value)]="statusFilter" />
            </div>
            <div toolbar class="flex w-full gap-2 sm:flex-wrap sm:gap-3">
              <app-dropdown class="hidden sm:block sm:w-56" size="sm" ariaLabel="Cedente" [options]="consignorOptions()" [(value)]="consignorFilter" />
              <app-dropdown class="hidden sm:block sm:w-56" size="sm" ariaLabel="Punto de venta" [options]="salesPointOptions()" [(value)]="salesPointFilter" />
              <app-search-field class="min-w-0 flex-1 sm:flex-none" [(value)]="search" placeholder="Buscar por nombre" />
              <app-filter-sheet class="shrink-0 sm:hidden" [count]="activeFilterCount()" [results]="filteredRows().length" noun="propuestas" (clear)="clearFilters()">
                <div>
                  <p class="t-label">Estado</p>
                  <app-filter-chips [options]="statusChips()" [(value)]="statusFilter" />
                </div>
                <div>
                  <p class="t-label">Cedente</p>
                  <app-dropdown ariaLabel="Cedente" [options]="consignorOptions()" [(value)]="consignorFilter" />
                </div>
                <div>
                  <p class="t-label">Punto de venta</p>
                  <app-dropdown ariaLabel="Punto de venta" [options]="salesPointOptions()" [(value)]="salesPointFilter" />
                </div>
              </app-filter-sheet>
            </div>

            @if (filteredRows().length) {
              <table class="t-table">
                <thead>
                  <tr>
                    <th>Prenda</th>
                    <th>Cedente</th>
                    <th>Estado</th>
                    <th class="t-num">Para el cedente</th>
                    <th class="t-num">Precio venta</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of pageRows(); track row.garmentId) {
                    <tr class="t-row-link" (click)="open(row)">
                      <td class="t-cell-main">
                        <div class="flex items-center gap-3">
                          <app-table-thumb [garmentId]="row.garmentId" [seed]="row.garmentId" />
                          <span class="min-w-0 max-w-[240px]">
                            <span class="block truncate font-bold">{{ row.name }}</span>
                            <span class="t-meta truncate">{{ row.category }} · {{ row.createdAt | shortDate }}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label="Cedente"><app-person-cell [name]="row.consignorName" /></td>
                      <td data-label="Estado"><app-status-badge [status]="row.status" /></td>
                      <td data-label="Para el cedente" class="t-num t-amount">{{ row.consignorPrice | money }}</td>
                      <td data-label="Precio venta" class="t-num t-amount">{{ row.salePrice | money }}</td>
                      <td class="t-cell-action text-right">
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
                      <td class="t-chev"><lucide-angular [img]="chevIcon" [size]="18" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <app-empty-state [compact]="true" [icon]="headerIcon" title="No hay propuestas acá" message="Probá con otro estado, cedente o punto de venta." />
            }
          </app-data-table>
        } @else {
          <app-empty-state [icon]="headerIcon" title="Todavía no hay propuestas" message="Cuando un cedente te ofrezca una prenda, la vas a ver acá para aceptarla, contraofertar o rechazarla." />
        }
      </div>
    }
  `,
})
export class MerchantProposals {
  protected readonly chevIcon = ChevronRight;
  protected readonly headerIcon = Inbox;
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
  /** Vuelve a la primera página cuando cambia algún filtro. */
  protected readonly page = linkedSignal({
    source: () => [this.search(), this.statusFilter(), this.consignorFilter(), this.salesPointFilter()],
    computation: () => 0,
  });

  protected readonly statusChips = computed<ChipOption<StatusFilter>[]>(() => {
    const rows = this.data()?.rows ?? [];
    return STATUS_FILTERS.map((o) => ({
      ...o,
      count: o.value === 'all' ? rows.length : rows.filter((r) => r.status === o.value).length,
    }));
  });

  protected readonly consignorOptions = computed<DropdownOption[]>(() => [
    { value: 'all', label: 'Todos los cedentes' },
    ...(this.data()?.consignors ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]);

  protected readonly salesPointOptions = computed<DropdownOption[]>(() => [
    { value: 'all', label: 'Todos los puntos' },
    ...(this.data()?.salesPoints ?? []).map((p) => ({ value: p.id, label: p.name })),
  ]);

  protected readonly activeFilterCount = computed(
    () =>
      [this.statusFilter() !== 'all', this.consignorFilter() !== 'all', this.salesPointFilter() !== 'all'].filter(Boolean)
        .length,
  );

  protected clearFilters(): void {
    this.statusFilter.set('all');
    this.consignorFilter.set('all');
    this.salesPointFilter.set('all');
  }

  protected readonly pageRows = computed(() => pageOf(this.filteredRows(), this.page()));

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
      garments: this.garmentsService.listMeta(),
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
