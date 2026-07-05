import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { GarmentStatus } from '../../../core/models/garment.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

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
  name: string;
  photo?: string;
  consignorId: string;
  consignorName: string;
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
        <p class="text-trama-dark/70">No pudimos cargar el inventario.</p>
        <button
          type="button"
          (click)="retry()"
          class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
        >
          Reintentar
        </button>
      </div>
    } @else if (data(); as d) {
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold text-trama-dark">Inventario</h1>

        @if (toReceive() > 0) {
          <button
            type="button"
            (click)="statusFilter.set('agreed')"
            class="flex w-full items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-left hover:bg-orange-100"
          >
            <span class="text-sm font-medium text-trama-dark">
              {{ toReceive() }}
              {{ toReceive() === 1 ? 'prenda por recibir' : 'prendas por recibir' }}
            </span>
            <span class="text-sm font-medium text-trama-brand">Ver</span>
          </button>
        }

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <app-stat-card title="Artículos en stock" [value]="d.stockCount" />
          <app-stat-card title="Valor a precio de venta" [value]="d.stockValue | money" />
          <app-stat-card title="Comprometido con cedentes" [value]="d.committed | money" />
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
            placeholder="Buscar por nombre"
            class="rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
          />
          <select
            [value]="statusFilter()"
            (change)="statusFilter.set($any($event.target).value)"
            class="rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
          >
            @for (option of statusFilters; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
          <select
            [value]="consignorFilter()"
            (change)="consignorFilter.set($any($event.target).value)"
            class="rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
          >
            <option value="all">Todos los cedentes</option>
            @for (option of d.consignors; track option.id) {
              <option [value]="option.id">{{ option.name }}</option>
            }
          </select>
          <select
            [value]="salesPointFilter()"
            (change)="salesPointFilter.set($any($event.target).value)"
            class="rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
          >
            <option value="all">Todos los puntos</option>
            @for (option of d.salesPoints; track option.id) {
              <option [value]="option.id">{{ option.name }}</option>
            }
          </select>
        </div>

        @if (filteredRows().length) {
          <div class="overflow-x-auto rounded-2xl border border-trama-sand-200 bg-white">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-trama-sand-200 text-trama-dark/60">
                <tr>
                  <th class="px-4 py-3 font-medium">Prenda</th>
                  <th class="px-4 py-3 font-medium">Cedente</th>
                  <th class="px-4 py-3 font-medium">Punto de venta</th>
                  <th class="px-4 py-3 font-medium">Estado</th>
                  <th class="px-4 py-3 font-medium">Precio venta</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRows(); track row.id) {
                  <tr
                    [routerLink]="['/m/inventory', row.id]"
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
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.consignorName }}</td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.salesPointName }}</td>
                    <td class="px-4 py-3"><app-status-badge [status]="row.status" /></td>
                    <td class="px-4 py-3 text-trama-dark/70">{{ row.salePrice | money }}</td>
                    <td class="px-4 py-3 text-right">
                      @if (row.status === 'agreed') {
                        <a
                          [routerLink]="['/m/garment', row.id, 'reception']"
                          (click)="$event.stopPropagation()"
                          class="inline-block rounded-lg bg-trama-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-trama-green-700"
                        >
                          Recibir
                        </a>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div
            class="rounded-2xl border border-dashed border-trama-sand-200 py-16 text-center text-trama-dark/60"
          >
            No hay artículos que coincidan con los filtros.
          </div>
        }
      </div>
    }
  `,
})
export class Inventory {
  private readonly auth = inject(AuthService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly agreementsService = inject(AgreementsService);

  protected readonly statusFilters = STATUS_FILTERS;

  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly consignorFilter = signal('all');
  protected readonly salesPointFilter = signal('all');

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
      if (term && !row.name.toLowerCase().includes(term)) return false;
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
              name: garment.name,
              photo: garment.photos[0],
              consignorId: garment.consignorId,
              consignorName: consignorName.get(garment.consignorId) ?? '—',
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
