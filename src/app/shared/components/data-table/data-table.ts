import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, model, output, signal } from '@angular/core';
import { ChevronLeft, ChevronRight, LucideAngularModule, Search, Shirt } from 'lucide-angular';
import { GarmentsService } from '../../../core/services/garments.service';
import { BLOB_PATH, BLOB_ROTATION, hashIndex } from '../../icons/trama-icons';
import { Avatar } from '../avatar/avatar';
import { VerifiedBadge } from '../verified-badge/verified-badge';

/*
 * Tablas de Trama (handoff §4.12). Una base compartida en piezas chicas para
 * que cada pantalla siga escribiendo su <table> con sus columnas:
 *
 *   <app-data-table [total]="rows.length" [shown]="page.length" noun="prendas" [(page)]="page">
 *     <app-filter-chips toolbar [options]="chips()" [(value)]="status" />
 *     <app-search-field toolbar [(value)]="search" placeholder="Buscar por nombre" />
 *     <table class="t-table"> … </table>
 *   </app-data-table>
 *
 * La tabla usa .t-table (styles.css): encabezado eyebrow con pespunte, filas con
 * hover crema y radio 14, montos a la derecha y, en el celular, cada fila pasa
 * a ser una tarjeta crema (las celdas muestran su data-label).
 */

export const PAGE_SIZE = 10;

/** Corta la página actual de una lista. */
export function pageOf<T>(rows: readonly T[], page: number, size = PAGE_SIZE): T[] {
  const last = Math.max(0, Math.ceil(rows.length / size) - 1);
  const p = Math.min(Math.max(0, page), last);
  return rows.slice(p * size, p * size + size);
}

@Component({
  selector: 'app-data-table',
  imports: [LucideAngularModule],
  host: { class: 'block t-fade-in', style: 'animation-delay: 180ms' },
  template: `
    <div class="t-card p-4 sm:p-6">
      <div class="toolbar flex flex-wrap items-center gap-3 empty:hidden">
        <ng-content select="[toolbar]" />
      </div>
      <div class="table-scroll -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <ng-content />
      </div>
      @if (total() > 0 && showFooter()) {
        <div
          class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-trama-sand-100 pt-4 text-sm text-trama-body"
        >
          <span>Mostrando {{ shown() }} de {{ total() }} {{ noun() }}</span>
          @if (pages() > 1) {
            <nav class="flex items-center gap-1" aria-label="Paginación">
              <button
                type="button"
                class="pg-btn"
                [disabled]="page() === 0"
                (click)="go(page() - 1)"
                aria-label="Página anterior"
              >
                <lucide-angular [img]="prevIcon" [size]="16" />
              </button>
              @for (p of pageList(); track p) {
                <button
                  type="button"
                  class="pg-btn"
                  [class.pg-on]="p === page()"
                  [attr.aria-current]="p === page() ? 'page' : null"
                  (click)="go(p)"
                >
                  {{ p + 1 }}
                </button>
              }
              <button
                type="button"
                class="pg-btn"
                [disabled]="page() >= pages() - 1"
                (click)="go(page() + 1)"
                aria-label="Página siguiente"
              >
                <lucide-angular [img]="nextIcon" [size]="16" />
              </button>
            </nav>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .toolbar:not(:empty) {
      margin-bottom: 18px;
    }
    .pg-btn {
      display: inline-flex;
      min-width: 34px;
      height: 34px;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      padding: 0 8px;
      font-weight: 700;
      color: var(--color-trama-dark);
      transition: background-color 150ms;
    }
    .pg-btn:hover:not(:disabled):not(.pg-on) {
      background: var(--color-trama-sand-50);
    }
    .pg-btn:disabled {
      color: var(--color-trama-thread-faint);
      cursor: not-allowed;
    }
    .pg-on {
      background: var(--color-trama-dark);
      color: var(--color-trama-sand-50);
    }
  `,
})
export class DataTable {
  readonly total = input(0);
  readonly shown = input(0);
  readonly noun = input('registros');
  readonly pageSize = input(PAGE_SIZE);
  readonly showFooter = input(true);
  readonly page = model(0);

  protected readonly prevIcon = ChevronLeft;
  protected readonly nextIcon = ChevronRight;

  protected readonly pages = computed(() => Math.ceil(this.total() / this.pageSize()));
  protected readonly pageList = computed(() => {
    const n = this.pages();
    const cur = this.page();
    const start = Math.max(0, Math.min(cur - 2, n - 5));
    return Array.from({ length: Math.min(5, n) }, (_, i) => start + i);
  });

  protected go(p: number): void {
    this.page.set(Math.min(Math.max(0, p), this.pages() - 1));
  }
}

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

/** Filtros de estado como chips con contador (handoff §4.12). */
@Component({
  selector: 'app-filter-chips',
  host: { class: 'flex flex-wrap gap-2', role: 'radiogroup' },
  template: `
    @for (o of options(); track o.value) {
      <button
        type="button"
        role="radio"
        class="t-chip"
        [attr.aria-checked]="o.value === value()"
        (click)="value.set(o.value)"
      >
        {{ o.label }}
        @if (o.count !== undefined) {
          <span class="t-chip-count">{{ o.count }}</span>
        }
      </button>
    }
  `,
})
export class FilterChips<T extends string = string> {
  readonly options = input.required<readonly ChipOption<T>[]>();
  readonly value = model.required<T>();
}

/** Buscador crema con lupa. */
@Component({
  selector: 'app-search-field',
  imports: [LucideAngularModule],
  host: { class: 'relative block w-full sm:ml-auto sm:w-64' },
  template: `
    <lucide-angular
      class="pointer-events-none absolute left-3 top-0 flex h-full items-center text-trama-muted"
      [img]="icon"
      [size]="17"
    />
    <input
      type="search"
      class="t-input t-input-sm"
      style="padding-left: 44px"
      [placeholder]="placeholder()"
      [attr.aria-label]="placeholder()"
      [value]="value()"
      (input)="value.set($any($event.target).value)"
    />
  `,
})
export class SearchField {
  readonly value = model('');
  readonly placeholder = input('Buscar');
  protected readonly icon = Search;
}

/**
 * Miniatura de 48 px: la foto o, si no hay, un blob de color rotativo girado
 * distinto en cada fila con el ícono Shirt.
 */
@Component({
  selector: 'app-table-thumb',
  imports: [LucideAngularModule],
  host: {
    class: 'relative inline-flex shrink-0 items-center justify-center',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  template: `
    @if (src(); as img) {
      <img [src]="img" alt="" class="h-full w-full rounded-[14px] object-cover" loading="lazy" />
    } @else {
      <svg class="absolute inset-0" [attr.width]="size()" [attr.height]="size()" viewBox="-32 -32 64 64" aria-hidden="true">
        <path [attr.d]="blob" [attr.fill]="fill()" [attr.transform]="'rotate(' + rotation() + ')'" />
      </svg>
      <lucide-angular class="relative flex" [img]="shirt" [size]="size() * 0.46" color="#1F3A2B" />
    }
  `,
})
export class TableThumb {
  readonly photo = input<string | undefined | null>(null);
  /** Id de la prenda: si se pasa (y no `photo`), la miniatura se trae al entrar en pantalla. */
  readonly garmentId = input('');
  /** Texto estable (id o nombre) para elegir color y giro. */
  readonly seed = input('');
  readonly size = input(48);
  protected readonly blob = BLOB_PATH;
  protected readonly shirt = Shirt;
  protected readonly fill = computed(() => BLOB_ROTATION[hashIndex(this.seed(), BLOB_ROTATION.length)]);
  protected readonly rotation = computed(() => (hashIndex(this.seed() + '*', 7) - 3) * 22);

  private readonly host = inject(ElementRef);
  private readonly garments = inject(GarmentsService);
  private readonly destroyRef = inject(DestroyRef);
  // Foto cargada de forma diferida; mientras tanto se muestra el placeholder.
  private readonly lazyPhoto = signal<string | null>(null);
  protected readonly src = computed(() => this.photo() ?? this.lazyPhoto());

  constructor() {
    afterNextRender(() => {
      if (this.photo() || !this.garmentId()) return;
      const el = this.host.nativeElement as HTMLElement;
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          this.garments.photo(this.garmentId()).subscribe((res) => this.lazyPhoto.set(res.photo));
        },
        { rootMargin: '150px' },
      );
      observer.observe(el);
      // Sin esto, una fila que sale de pantalla antes de verse dejaría el observador activo.
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

/** Celda de persona: avatar con iniciales (30 px), nombre y parche de verificado de 15 px. */
@Component({
  selector: 'app-person-cell',
  imports: [Avatar, VerifiedBadge],
  host: { class: 'flex min-w-0 items-center gap-2.5' },
  template: `
    <app-avatar [name]="name()" [kind]="kind()" [size]="30" />
    <span class="truncate text-[15px] text-trama-dark">{{ name() }}</span>
    @if (verified()) {
      <app-verified-badge [size]="15" />
    }
  `,
})
export class PersonCell {
  readonly name = input('');
  readonly kind = input<'consignor' | 'merchant'>('consignor');
  readonly verified = input(false);
}
