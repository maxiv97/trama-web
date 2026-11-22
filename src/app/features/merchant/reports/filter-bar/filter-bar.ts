import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  DashboardFilterOptionsService,
  FilterOption,
} from '../../../../core/services/dashboard-filter-options.service';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { Dropdown, DropdownOption } from '../../../../shared/components/dropdown/dropdown';
import { Segmented, SegmentOption } from '../../../../shared/components/segmented/segmented';
import { mediaQuery, NARROW_SCREEN } from '../../../../shared/utils/media-query';
import { FilterSheet } from '../../../../shared/components/filter-sheet/filter-sheet';

const PERIODS: SegmentOption[] = [
  { value: 'all', label: 'Todo el período' },
  { value: 'this-month', label: 'Este mes' },
  { value: 'last-month', label: 'Mes pasado' },
  { value: 'last-3', label: 'Últimos 3 meses' },
];

const pad = (n: number): string => String(n).padStart(2, '0');
const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function rangeFor(key: string): { from?: string; to?: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case 'this-month':
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case 'last-month':
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case 'last-3':
      return { from: iso(new Date(y, m - 2, 1)), to: iso(new Date(y, m + 1, 0)) };
    default:
      return { from: undefined, to: undefined };
  }
}

function withAll(all: string, options: FilterOption[]): DropdownOption[] {
  return [{ value: '', label: all }, ...options];
}

@Component({
  selector: 'app-reports-filter-bar',
  imports: [Dropdown, FilterSheet, Segmented],
  template: `
    <div class="flex flex-wrap items-center gap-3">
      @if (narrow()) {
        <app-dropdown
          class="min-w-0 flex-1"
          ariaLabel="Período"
          [options]="periods"
          [value]="periodKey()"
          (valueChange)="choosePeriod($event)"
        />
      } @else {
        <app-segmented
          class="basis-full"
          ariaLabel="Período"
          [options]="periods"
          [value]="periodKey()"
          (valueChange)="choosePeriod($event)"
        />
      }

      <app-filter-sheet [active]="activeInSheet()" (clear)="clearSheet()">
        <ng-template let-inSheet>
          <div class="space-y-2 md:w-56">
            @if (inSheet) {
              <p class="trama-label text-trama-dark">Punto de venta</p>
            }
            <app-dropdown
              ariaLabel="Punto de venta"
              [options]="salesPoints()"
              [value]="filters.salesPointId() ?? ''"
              (valueChange)="filters.setSalesPoint($event || undefined)"
            />
          </div>
          <div class="space-y-2 md:w-56">
            @if (inSheet) {
              <p class="trama-label mt-3 text-trama-dark">Categoría</p>
            }
            <app-dropdown
              ariaLabel="Categoría"
              [options]="categories()"
              [value]="filters.category() ?? ''"
              (valueChange)="filters.setCategory($event || undefined)"
            />
          </div>
          <div class="space-y-2 md:w-56">
            @if (inSheet) {
              <p class="trama-label mt-3 text-trama-dark">Cedente</p>
            }
            <app-dropdown
              ariaLabel="Cedente"
              [options]="consignors()"
              [value]="filters.consignorId() ?? ''"
              (valueChange)="filters.setConsignor($event || undefined)"
            />
          </div>
        </ng-template>
      </app-filter-sheet>

      @if (!narrow() && filters.hasAny()) {
        <button
          type="button"
          class="trama-btn trama-btn--ghost trama-btn--small"
          (click)="clearAll()"
        >
          Limpiar filtros
        </button>
      }
    </div>
  `,
})
export class ReportsFilterBar {
  protected readonly filters = inject(DashboardFiltersService);
  private readonly options = inject(DashboardFilterOptionsService);
  private readonly auth = inject(AuthService);

  protected readonly narrow = mediaQuery(NARROW_SCREEN);
  protected readonly periods = PERIODS;

  protected readonly periodKey = computed(() => {
    const from = this.filters.from();
    const to = this.filters.to();
    const match = PERIODS.find(({ value }) => {
      const range = rangeFor(value);
      return range.from === from && range.to === to;
    });
    return match?.value ?? 'all';
  });

  private readonly merchantId = this.auth.user()?.id;

  protected readonly categories = toSignal(
    (this.merchantId ? this.options.categories(this.merchantId) : of<FilterOption[]>([])).pipe(
      map((options) => withAll('Todas las categorías', options)),
    ),
    { initialValue: withAll('Todas las categorías', []) },
  );

  protected readonly salesPoints = toSignal(
    (this.merchantId ? this.options.salesPoints(this.merchantId) : of<FilterOption[]>([])).pipe(
      map((options) => withAll('Todos los puntos', options)),
    ),
    { initialValue: withAll('Todos los puntos', []) },
  );

  protected readonly consignors = toSignal(
    this.options.consignors().pipe(map((options) => withAll('Todos los cedentes', options))),
    { initialValue: withAll('Todos los cedentes', []) },
  );

  protected readonly activeInSheet = computed(
    () =>
      Number(!!this.filters.salesPointId()) +
      Number(!!this.filters.category()) +
      Number(!!this.filters.consignorId()),
  );

  protected choosePeriod(key: string | null): void {
    const range = rangeFor(key ?? 'all');
    this.filters.setPeriod(range.from, range.to);
  }

  protected clearSheet(): void {
    this.filters.setSalesPoint(undefined);
    this.filters.setCategory(undefined);
    this.filters.setConsignor(undefined);
  }

  protected clearAll(): void {
    this.filters.clear();
  }
}
