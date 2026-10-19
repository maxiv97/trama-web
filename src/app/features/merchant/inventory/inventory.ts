import { ChevronRight, LucideAngularModule } from 'lucide-angular';
import { FilterSheet } from '../../../shared/components/filter-sheet/filter-sheet';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { GarmentStatus } from '../../../core/models/garment.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { SalesService } from '../../../core/services/sales.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { Hanger } from '../../../shared/icons/trama-icons';
import { ChipOption, DataTable, FilterChips, pageOf, PersonCell, SearchField, TableThumb } from '../../../shared/components/data-table/data-table';
import { Dropdown, DropdownOption } from '../../../shared/components/dropdown/dropdown';

type StatusFilter = 'all' | GarmentStatus;

const INVENTORY_STATUSES: GarmentStatus[] = [
  'agreed',
  'in_stock',
  'with_remarks',
  'sold',
  'paid_out',
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'agreed', label: 'Por recibir' },
  { value: 'in_stock', label: 'En stock' },
  { value: 'with_remarks', label: 'Con observaciones' },
  { value: 'sold', label: 'Vendido' },
  { value: 'paid_out', label: 'Liquidado' },
];

interface InventoryRow {
  id: string;
  code?: string;
  name: string;
  photo?: string;
  consignorId: string;
  consignorName: string;
  consignorVerified: boolean;
  meta: string;
  salesPointId?: string;
  salesPointName: string;
  status: GarmentStatus;
  salePrice?: number;
  consignorPrice?: number;
}

interface FilterOption {
  id: string;
  name: string;
}

interface InventoryData {
  rows: InventoryRow[];
  stockCount: number;
  stockValue: number;
  committed: number;
  consignors: FilterOption[];
  salesPoints: FilterOption[];
}

type InventoryState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: InventoryData };

@Component({
  selector: 'app-inventory',
  imports: [FilterSheet, LucideAngularModule, Dropdown, PersonCell, TableThumb, SearchField, FilterChips, DataTable, PageSkeleton, PageHeader, RouterLink, StatCard, StatusBadge, MoneyPipe, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="table" />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar el inventario." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <app-page-header title="Inventario" section="Inventario" [icon]="headerIcon" lead="Las prendas que aceptaste, desde que las recibís hasta que se venden." />

        @if (toReceive() > 0 && statusFilter() !== 'agreed') {
          <button type="button" (click)="statusFilter.set('agreed')" class="t-notice w-full text-left hover:brightness-[.98]">
            <span class="flex-1">
              <strong class="font-bold">{{ toReceive() }} {{ toReceive() === 1 ? 'prenda espera' : 'prendas esperan' }} que la recibas.</strong>
              Cuando llegue al local, registrá la recepción para ponerla en stock.
            </span>
            <span class="font-bold underline underline-offset-2">Ver</span>
          </button>
        }

        <div class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 [&>:first-child]:col-span-2 md:[&>:first-child]:col-span-1">
          <app-stat-card title="Artículos en stock" [value]="d.stockCount" [highlight]="true" />
          <app-stat-card title="Valor a precio de venta" [value]="d.stockValue | money" />
          <app-stat-card title="Comprometido con cedentes" [value]="d.committed | money" />
        </div>

        <app-data-table [total]="filteredRows().length" [shown]="pageRows().length" noun="prendas" [(page)]="page">
          <div toolbar class="hidden w-full sm:block">
            <app-filter-chips [options]="statusChips()" [(value)]="statusFilter" />
          </div>
          <div toolbar class="flex w-full gap-2 sm:flex-wrap sm:gap-3">
            <app-dropdown class="hidden sm:block sm:w-56" size="sm" ariaLabel="Cedente" [options]="consignorOptions()" [(value)]="consignorFilter" />
            <app-dropdown class="hidden sm:block sm:w-56" size="sm" ariaLabel="Punto de venta" [options]="salesPointOptions()" [(value)]="salesPointFilter" />
            <app-search-field class="min-w-0 flex-1 sm:flex-none" [(value)]="search" placeholder="Buscar por nombre, código o cedente" />
            <app-filter-sheet class="shrink-0 sm:hidden" [count]="activeFilterCount()" [results]="filteredRows().length" noun="prendas" (clear)="clearFilters()">
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

          @if (selectedCount() > 0) {
            <div class="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-trama-brand/30 bg-trama-green-50 px-4 py-3">
              <span class="text-sm font-semibold text-trama-dark">
                {{ selectedCount() }} {{ selectedCount() === 1 ? 'prenda seleccionada' : 'prendas seleccionadas' }}
              </span>
              @if (sellableCount() > 1) {
                <button type="button" (click)="toggleAll()" class="text-sm font-semibold text-trama-brand underline underline-offset-2">
                  {{ allSelected() ? 'Quitar selección' : 'Seleccionar todas (' + sellableCount() + ')' }}
                </button>
              }
              <button type="button" (click)="bulkOpen.set(true)" class="t-btn t-btn-primary t-btn-sm">
                Marcar como vendidas
              </button>
              <button type="button" (click)="clearSelection()" class="t-btn t-btn-sm">Cancelar</button>
            </div>
          }

          @if (filteredRows().length) {
            <table class="t-table">
              <thead>
                <tr>
                  <th class="w-10">
                    @if (sellableCount() > 0) {
                      <input
                        type="checkbox"
                        class="h-4 w-4 accent-trama-brand"
                        [checked]="allSelected()"
                        [indeterminate]="someSelected()"
                        (change)="toggleAll()"
                        aria-label="Seleccionar todas las prendas en stock"
                      />
                    }
                  </th>
                  <th>Prenda</th>
                  <th>Cedente</th>
                  <th>Punto de venta</th>
                  <th>Estado</th>
                  <th class="t-num">Precio</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of pageRows(); track row.id) {
                  <tr class="t-row-link" [routerLink]="['/m/inventory', row.id]">
                    <td class="w-10" (click)="$event.stopPropagation()">
                      @if (sellable(row.status)) {
                        <input
                          type="checkbox"
                          class="h-4 w-4 accent-trama-brand"
                          [checked]="isSelected(row.id)"
                          (change)="toggle(row.id)"
                          [attr.aria-label]="'Seleccionar ' + row.name"
                        />
                      }
                    </td>
                    <td class="t-cell-main">
                      <div class="flex items-center gap-3">
                        <app-table-thumb [photo]="row.photo" [seed]="row.id" />
                        <span class="min-w-0 max-w-[260px]">
                          <span class="block truncate font-bold">{{ row.name }}</span>
                          <span class="t-meta">{{ row.meta }}</span>
                        </span>
                      </div>
                    </td>
                    <td data-label="Cedente"><app-person-cell [name]="row.consignorName" [verified]="row.consignorVerified" /></td>
                    <td data-label="Punto de venta" class="t-muted">{{ row.salesPointName }}</td>
                    <td data-label="Estado"><app-status-badge [status]="row.status" /></td>
                    <td data-label="Precio" class="t-num t-amount">{{ row.salePrice | money }}</td>
                    <td class="t-cell-action text-right">
                      @if (row.status === 'agreed') {
                        <a
                          [routerLink]="['/m/garment', row.id, 'reception']"
                          (click)="$event.stopPropagation()"
                          class="t-btn t-btn-primary t-btn-sm"
                        >
                          Recibir
                        </a>
                      }
                    </td>
                    <td class="t-chev"><lucide-angular [img]="chevIcon" [size]="18" /></td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <app-empty-state [compact]="true" [icon]="headerIcon" title="No hay prendas acá" message="Probá con otro estado, cedente o punto de venta." />
          }
        </app-data-table>
      </div>

      @if (bulkOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="bulkOpen.set(false)">
          <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg" (click)="$event.stopPropagation()">
            <h2 class="text-title-3 text-trama-dark">
              Marcar {{ selectedCount() }} {{ selectedCount() === 1 ? 'prenda' : 'prendas' }} como vendidas
            </h2>
            <p class="mt-2 text-sm text-trama-muted">
              Se registran al precio de venta acordado de cada prenda.
            </p>
            <label class="mt-4 block text-sm">
              <span class="t-label">Fecha de venta</span>
              <input
                type="date"
                class="t-input mt-1"
                [value]="bulkDate()"
                (change)="bulkDate.set($any($event.target).value)"
              />
            </label>
            <div class="mt-6 flex justify-end gap-3">
              <button type="button" (click)="bulkOpen.set(false)" class="t-btn">Cancelar</button>
              <button
                type="button"
                (click)="confirmBulk()"
                [disabled]="bulkSaving()"
                class="t-btn t-btn-primary"
              >
                {{ bulkSaving() ? 'Registrando…' : 'Marcar vendidas' }}
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class Inventory {
  protected readonly chevIcon = ChevronRight;
  protected readonly headerIcon = Hanger;
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly salesService = inject(SalesService);
  private readonly toast = inject(ToastService);

  protected readonly statusFilters = STATUS_FILTERS;

  // Selección para marcar varias prendas como vendidas a la vez.
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly bulkOpen = signal(false);
  protected readonly bulkDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly bulkSaving = signal(false);

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
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

  protected readonly selectedCount = computed(() => this.selected().size);

  // Una prenda se puede marcar vendida si está en stock (con o sin observaciones).
  protected sellable(status: GarmentStatus): boolean {
    return status === 'in_stock' || status === 'with_remarks';
  }

  // "Seleccionar todas" abarca las vendibles del resultado filtrado (todas las
  // páginas), no solo la visible.
  private readonly sellableIds = computed(() =>
    this.filteredRows()
      .filter((row) => this.sellable(row.status))
      .map((row) => row.id),
  );
  protected readonly sellableCount = computed(() => this.sellableIds().length);
  protected readonly allSelected = computed(() => {
    const ids = this.sellableIds();
    return ids.length > 0 && ids.every((id) => this.selected().has(id));
  });
  protected readonly someSelected = computed(
    () => this.selectedCount() > 0 && !this.allSelected(),
  );

  protected toggleAll(): void {
    if (this.allSelected()) this.clearSelection();
    else this.selected.set(new Set(this.sellableIds()));
  }

  protected isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  protected toggle(id: string): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected confirmBulk(): void {
    const ids = [...this.selected()];
    if (!ids.length || this.bulkSaving()) return;
    this.bulkSaving.set(true);
    this.salesService.bulkCreate(ids, this.bulkDate()).subscribe({
      next: (result) => {
        this.bulkSaving.set(false);
        this.bulkOpen.set(false);
        this.selected.set(new Set());
        const ok = result.sold.length;
        const message = result.failed.length
          ? `${ok} marcadas como vendidas · ${result.failed.length} no se pudieron`
          : `${ok} ${ok === 1 ? 'prenda marcada' : 'prendas marcadas'} como vendidas`;
        this.toast.show(message, result.failed.length ? 'error' : 'success');
        this.reload.next();
      },
      error: () => {
        this.bulkSaving.set(false);
        this.toast.show('No pudimos registrar las ventas', 'error');
      },
    });
  }

  protected readonly pageRows = computed(() => pageOf(this.filteredRows(), this.page()));

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): InventoryState => ({ status: 'loaded', data })),
          startWith<InventoryState>({ status: 'loading', data: null }),
          catchError((): Observable<InventoryState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as InventoryState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly toReceive = computed(
    () => this.data()?.rows.filter((row) => row.status === 'agreed').length ?? 0,
  );

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
      if (
        term &&
        !row.name.toLowerCase().includes(term) &&
        !(row.code ?? '').toLowerCase().includes(term) &&
        !row.consignorName.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  });

  protected retry(): void {
    this.reload.next();
  }

  private load(): Observable<InventoryData> {
    const merchantId = this.auth.user()?.id ?? '';
    return forkJoin({
      garments: this.garmentsService.byMerchant(merchantId),
      consignors: this.consignorsService.list(),
      merchant: this.merchantsService.getById(merchantId),
      agreements: this.agreementsService.list(),
    }).pipe(
      map(({ garments, consignors, merchant, agreements }): InventoryData => {
        const consignorName = new Map(consignors.map((consignor) => [consignor.id, consignor.name]));
        const consignorVerified = new Map(consignors.map((consignor) => [consignor.id, consignor.verified]));
        const salesPointName = new Map(
          (merchant?.salesPoints ?? []).map((point) => [point.id, point.name]),
        );
        const agreementByGarment = new Map(
          agreements.map((agreement) => [agreement.garmentId, agreement]),
        );

        const inventory = garments.filter((garment) =>
          INVENTORY_STATUSES.includes(garment.status),
        );

        const rows: InventoryRow[] = inventory
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((garment) => {
            const agreement = agreementByGarment.get(garment.id);
            return {
              id: garment.id,
              code: garment.code,
              name: garment.name,
              photo: garment.photos[0],
              consignorId: garment.consignorId,
              consignorName: consignorName.get(garment.consignorId) ?? '—',
              consignorVerified: consignorVerified.get(garment.consignorId) ?? false,
              meta: [garment.code, garment.category, garment.size].filter(Boolean).join(' · '),
              salesPointId: garment.salesPointId,
              salesPointName: garment.salesPointId
                ? (salesPointName.get(garment.salesPointId) ?? '—')
                : '—',
              status: garment.status,
              salePrice: agreement?.agreedSalePrice,
              consignorPrice: agreement?.agreedConsignorPrice,
            };
          });

        const inStock = rows.filter(
          (row) => row.status === 'in_stock' || row.status === 'with_remarks',
        );

        const usedConsignors = new Set(rows.map((row) => row.consignorId));
        const usedSalesPoints = new Set(
          rows.map((row) => row.salesPointId).filter((id): id is string => !!id),
        );

        return {
          rows,
          stockCount: inStock.length,
          stockValue: inStock.reduce((total, row) => total + (row.salePrice ?? 0), 0),
          committed: inStock.reduce((total, row) => total + (row.consignorPrice ?? 0), 0),
          consignors: consignors
            .filter((consignor) => usedConsignors.has(consignor.id))
            .map((consignor) => ({ id: consignor.id, name: consignor.name })),
          salesPoints: (merchant?.salesPoints ?? [])
            .filter((point) => usedSalesPoints.has(point.id))
            .map((point) => ({ id: point.id, name: point.name })),
        };
      }),
    );
  }
}
