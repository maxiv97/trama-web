import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  DashboardFilterOptionsService,
  FilterOption,
} from '../../../../core/services/dashboard-filter-options.service';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';
import { Dropdown, DropdownOption } from '../../../../shared/components/dropdown/dropdown';
import { Segmented } from '../../../../shared/components/tabs/tabs';

interface PeriodPreset {
  key: string;
  label: string;
}

const PERIODS: PeriodPreset[] = [
  { key: 'all', label: 'Todo' },
  { key: 'this-month', label: 'Este mes' },
  { key: 'last-month', label: 'Mes pasado' },
  { key: 'last-3', label: 'Últimos 3 meses' },
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

@Component({
  selector: 'app-reports-filter-bar',
  imports: [Segmented, Dropdown],
  template: `
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <app-segmented ariaLabel="Período" [onPage]="true" [options]="periodOptions" [value]="periodKey()" (valueChange)="onPeriod($event)" />
        <div class="flex flex-1 flex-wrap gap-3">
          <app-dropdown class="w-full sm:w-52" size="sm" [onPage]="true" ariaLabel="Punto de venta"
            [options]="salesPointOptions()" [value]="filters.salesPointId() ?? ''" (valueChange)="filters.setSalesPoint($event || undefined)" />
          <app-dropdown class="w-full sm:w-52" size="sm" [onPage]="true" ariaLabel="Categoría"
            [options]="categoryOptions()" [value]="filters.category() ?? ''" (valueChange)="filters.setCategory($event || undefined)" />
          <app-dropdown class="w-full sm:w-52" size="sm" [onPage]="true" ariaLabel="Cedente"
            [options]="consignorOptions()" [value]="filters.consignorId() ?? ''" (valueChange)="filters.setConsignor($event || undefined)" />
        </div>
      </div>

      @if (chips().length) {
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-eyebrow">Recorte activo</span>
          @for (chip of chips(); track chip.key) {
            <span class="inline-flex items-center rounded-full bg-trama-green-50 px-3 py-1 text-[13px] font-bold text-trama-green-700">
              {{ chip.label }}
            </span>
          }
          <button type="button" (click)="clear()" class="t-link">Limpiar</button>
        </div>
      }
    </div>
  `,
})
export class ReportsFilterBar {
  protected readonly filters = inject(DashboardFiltersService);
  private readonly options = inject(DashboardFilterOptionsService);
  private readonly auth = inject(AuthService);

  protected readonly periods = PERIODS;
  protected readonly periodOptions = PERIODS.map((p) => ({ value: p.key, label: p.label }));
  protected readonly salesPointOptions = computed<DropdownOption[]>(() => [
    { value: '', label: 'Todos los puntos' },
    ...this.salesPoints().map((o) => ({ value: o.value, label: o.label })),
  ]);
  protected readonly categoryOptions = computed<DropdownOption[]>(() => [
    { value: '', label: 'Todas las categorías' },
    ...this.categories().map((o) => ({ value: o.value, label: o.label })),
  ]);
  protected readonly consignorOptions = computed<DropdownOption[]>(() => [
    { value: '', label: 'Todos los cedentes' },
    ...this.consignors().map((o) => ({ value: o.value, label: o.label })),
  ]);
  protected readonly periodKey = signal<string>('all');

  protected readonly categories = toSignal(
    this.auth.user()?.id ? this.options.categories(this.auth.user()!.id) : of<FilterOption[]>([]),
    { initialValue: [] as FilterOption[] },
  );

  protected readonly salesPoints = toSignal(
    this.auth.user()?.id ? this.options.salesPoints(this.auth.user()!.id) : of<FilterOption[]>([]),
    { initialValue: [] as FilterOption[] },
  );
  protected readonly consignors = toSignal(this.options.consignors(), {
    initialValue: [] as FilterOption[],
  });

  protected readonly chips = computed(() => {
    const chips: { key: string; label: string }[] = [];
    const period = this.periods.find((p) => p.key === this.periodKey());
    if (period && period.key !== 'all') chips.push({ key: 'period', label: period.label });
    const sp = this.salesPoints().find((o) => o.value === this.filters.salesPointId());
    if (sp) chips.push({ key: 'sp', label: sp.label });
    const category = this.filters.category();
    if (category) chips.push({ key: 'category', label: category });
    const consignor = this.consignors().find((o) => o.value === this.filters.consignorId());
    if (consignor) chips.push({ key: 'consignor', label: consignor.label });
    return chips;
  });

  protected onPeriod(key: string): void {
    this.periodKey.set(key);
    const range = rangeFor(key);
    this.filters.setPeriod(range.from, range.to);
  }

  protected clear(): void {
    this.periodKey.set('all');
    this.filters.clear();
  }
}
