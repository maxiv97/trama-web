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
import { Drawer } from '../../../../shared/components/drawer/drawer';
import { NgTemplateOutlet } from '@angular/common';
import { LucideAngularModule, SlidersHorizontal } from 'lucide-angular';

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
  imports: [Segmented, Dropdown, Drawer, LucideAngularModule, NgTemplateOutlet],
  styles: `
    .f-on {
      background: var(--color-trama-dark);
      color: var(--color-trama-sand-50);
    }
  `,
  template: `
    <!-- Escritorio: período segmentado y filtros a la vista -->
    <div class="hidden flex-wrap items-center gap-3 sm:flex">
      <app-segmented ariaLabel="Período" [onPage]="true" [options]="periodOptions" [value]="periodKey()" (valueChange)="onPeriod($event)" />
      <div class="flex flex-1 flex-wrap gap-3">
        <ng-container *ngTemplateOutlet="filtersTpl; context: { stacked: false }" />
      </div>
    </div>

    <!-- Celular: un solo selector de período y el resto en un drawer -->
    <div class="flex items-center gap-2 sm:hidden">
      <app-dropdown class="min-w-0 flex-1" [onPage]="true" ariaLabel="Período" [options]="periodOptions" [value]="periodKey()" (valueChange)="onPeriod($event)" />
      <button
        type="button"
        class="t-btn t-btn-secondary relative shrink-0 !px-4"
        [class.f-on]="activeFilters()"
        (click)="sheetOpen.set(true)"
        aria-haspopup="dialog"
      >
        <lucide-angular [img]="filterIcon" [size]="18" />
        Filtros
        @if (activeFilters()) {
          <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-trama-gold px-1.5 text-xs font-bold text-trama-dark">{{ activeFilters() }}</span>
        }
      </button>
    </div>

    @if (sheetOpen()) {
      <app-drawer side="auto" eyebrow="Reportes" title="Filtrar" lead="Elegí el punto de venta, la categoría o el cedente." (close)="sheetOpen.set(false)">
        <div class="space-y-4 pb-5">
          <ng-container *ngTemplateOutlet="filtersTpl; context: { stacked: true }" />
        </div>
        <button footer type="button" class="t-btn t-btn-ghost mr-auto" [disabled]="!activeFilters()" (click)="clearFilters()">Limpiar</button>
        <button footer type="button" class="t-btn t-btn-primary" (click)="sheetOpen.set(false)">Ver reportes</button>
      </app-drawer>
    }

    <ng-template #filtersTpl let-stacked="stacked">
      <div [class]="stacked ? 'block' : 'contents'">
        @if (stacked) {
          <span class="t-label">Punto de venta</span>
        }
        <app-dropdown [class]="stacked ? 'block' : 'w-full sm:w-52'" size="sm" [onPage]="!stacked" ariaLabel="Punto de venta"
          [options]="salesPointOptions()" [value]="filters.salesPointId() ?? ''" (valueChange)="filters.setSalesPoint($event || undefined)" />
      </div>
      <div [class]="stacked ? 'block' : 'contents'">
        @if (stacked) {
          <span class="t-label">Categoría</span>
        }
        <app-dropdown [class]="stacked ? 'block' : 'w-full sm:w-52'" size="sm" [onPage]="!stacked" ariaLabel="Categoría"
          [options]="categoryOptions()" [value]="filters.category() ?? ''" (valueChange)="filters.setCategory($event || undefined)" />
      </div>
      <div [class]="stacked ? 'block' : 'contents'">
        @if (stacked) {
          <span class="t-label">Cedente</span>
        }
        <app-dropdown [class]="stacked ? 'block' : 'w-full sm:w-52'" size="sm" [onPage]="!stacked" ariaLabel="Cedente"
          [options]="consignorOptions()" [value]="filters.consignorId() ?? ''" (valueChange)="filters.setConsignor($event || undefined)" />
      </div>
    </ng-template>
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

  protected readonly sheetOpen = signal(false);
  protected readonly filterIcon = SlidersHorizontal;
  /** Cuántos filtros (fuera del período) están aplicados. */
  protected readonly activeFilters = computed(
    () =>
      [this.filters.salesPointId(), this.filters.category(), this.filters.consignorId()].filter(Boolean)
        .length,
  );

  protected onPeriod(key: string): void {
    this.periodKey.set(key);
    const range = rangeFor(key);
    this.filters.setPeriod(range.from, range.to);
  }

  protected clearFilters(): void {
    this.filters.setSalesPoint(undefined);
    this.filters.setCategory(undefined);
    this.filters.setConsignor(undefined);
  }
}
