import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  DashboardFilterOptionsService,
  FilterOption,
} from '../../../../core/services/dashboard-filter-options.service';
import { DashboardFiltersService } from '../../../../core/services/dashboard-filters.service';

interface PeriodPreset {
  key: string;
  label: string;
}

const PERIODS: PeriodPreset[] = [
  { key: 'all', label: 'Todo el período' },
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
  template: `
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <select
          [value]="periodKey()"
          (change)="onPeriod($any($event.target).value)"
          aria-label="Período"
          class="rounded-lg border border-trama-sand-200 bg-white px-3 py-2 text-sm"
        >
          @for (p of periods; track p.key) {
            <option [value]="p.key">{{ p.label }}</option>
          }
        </select>

        <select
          [value]="filters.salesPointId() ?? ''"
          (change)="filters.setSalesPoint($any($event.target).value || undefined)"
          aria-label="Punto de venta"
          class="rounded-lg border border-trama-sand-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los puntos</option>
          @for (o of salesPoints(); track o.value) {
            <option [value]="o.value">{{ o.label }}</option>
          }
        </select>

        <select
          [value]="filters.category() ?? ''"
          (change)="filters.setCategory($any($event.target).value || undefined)"
          aria-label="Categoría"
          class="rounded-lg border border-trama-sand-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todas las categorías</option>
          @for (o of categories(); track o.value) {
            <option [value]="o.value">{{ o.label }}</option>
          }
        </select>

        <select
          [value]="filters.consignorId() ?? ''"
          (change)="filters.setConsignor($any($event.target).value || undefined)"
          aria-label="Cedente"
          class="rounded-lg border border-trama-sand-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los cedentes</option>
          @for (o of consignors(); track o.value) {
            <option [value]="o.value">{{ o.label }}</option>
          }
        </select>
      </div>

      @if (chips().length) {
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-trama-dark/40">
            Recorte activo
          </span>
          @for (chip of chips(); track chip.key) {
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-trama-green-200 bg-trama-green-50 px-3 py-1 text-xs font-medium text-trama-green-700"
            >
              {{ chip.label }}
            </span>
          }
          <button
            (click)="clear()"
            class="text-xs font-semibold text-trama-brand underline"
          >
            Limpiar
          </button>
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
