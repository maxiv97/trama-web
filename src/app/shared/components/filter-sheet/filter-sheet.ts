import { Component, input, output, signal } from '@angular/core';
import { LucideAngularModule, SlidersHorizontal } from 'lucide-angular';
import { Drawer } from '../drawer/drawer';

/**
 * Filtros agrupados para el celular: un botón "Filtros" (con la cantidad de
 * filtros aplicados) que abre una hoja inferior con los controles proyectados,
 * "Limpiar" y "Ver N resultados". En escritorio los filtros siguen a la vista;
 * este componente se muestra solo en pantallas chicas (sm:hidden en el uso).
 *
 *   <app-filter-sheet class="sm:hidden" [count]="n" [results]="rows.length" noun="prendas" (clear)="reset()">
 *     …chips y dropdowns…
 *   </app-filter-sheet>
 */
@Component({
  selector: 'app-filter-sheet',
  imports: [Drawer, LucideAngularModule],
  host: { class: 'block' },
  template: `
    <button
      type="button"
      class="t-btn t-btn-secondary w-full !px-4"
      [class.f-on]="count() > 0"
      aria-haspopup="dialog"
      (click)="open.set(true)"
    >
      <lucide-angular [img]="icon" [size]="18" />
      Filtros
      @if (count() > 0) {
        <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-trama-gold px-1.5 text-xs font-bold text-trama-dark">{{ count() }}</span>
      }
    </button>

    @if (open()) {
      <app-drawer side="auto" [eyebrow]="eyebrow()" title="Filtrar" (close)="open.set(false)">
        <div class="space-y-5 pb-5">
          <ng-content />
        </div>
        <button footer type="button" class="t-btn t-btn-ghost mr-auto" [disabled]="count() === 0" (click)="clear.emit()">
          Limpiar
        </button>
        <button footer type="button" class="t-btn t-btn-primary" (click)="open.set(false)">
          Ver {{ results() }} {{ noun() }}
        </button>
      </app-drawer>
    }
  `,
  styles: `
    .f-on {
      background: var(--color-trama-dark);
      color: var(--color-trama-sand-50);
    }
  `,
})
export class FilterSheet {
  /** Filtros aplicados (sin contar la búsqueda). */
  readonly count = input(0);
  readonly results = input(0);
  readonly noun = input('resultados');
  readonly eyebrow = input('');
  readonly clear = output<void>();

  protected readonly open = signal(false);
  protected readonly icon = SlidersHorizontal;
}
