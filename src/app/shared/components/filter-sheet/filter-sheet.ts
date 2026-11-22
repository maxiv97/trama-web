import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  contentChild,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { LucideAngularModule, SlidersHorizontal } from 'lucide-angular';
import { mediaQuery, NARROW_SCREEN } from '../../utils/media-query';
import { Drawer } from '../drawer/drawer';

@Component({
  selector: 'app-filter-sheet',
  imports: [NgTemplateOutlet, LucideAngularModule, Drawer],
  template: `
    @if (narrow()) {
      <button
        type="button"
        class="trama-btn trama-btn--outline trigger"
        aria-haspopup="dialog"
        (click)="open.set(true)"
      >
        <lucide-angular [img]="filterIcon" [size]="18" />
        {{ heading() }}
        @if (active()) {
          <span class="count">{{ active() }}<span class="sr-only"> activos</span></span>
        }
      </button>

      <app-drawer [heading]="heading()" [(open)]="open">
        <div class="filters">
          <ng-container *ngTemplateOutlet="filters(); context: { $implicit: true }" />
        </div>
        <div drawerFooter class="actions">
          <button
            type="button"
            class="trama-btn trama-btn--ghost"
            [disabled]="!active()"
            (click)="clear.emit()"
          >
            Limpiar
          </button>
          <button type="button" class="trama-btn" (click)="open.set(false)">
            {{ showLabel() }}
          </button>
        </div>
      </app-drawer>
    } @else {
      <ng-container *ngTemplateOutlet="filters(); context: { $implicit: false }" />
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .filters {
      --trama-dropdown-panel: static;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .trigger {
      gap: 8px;
      padding-inline: 14px;
    }

    .count {
      min-width: 20px;
      padding: 1px 6px;
      border-radius: 999px;
      background-color: var(--color-trama-dark);
      color: var(--color-trama-paper);
      font-size: 0.75rem;
      font-weight: 700;
      text-align: center;
    }

    .actions {
      display: flex;
      gap: 8px;
      width: 100%;
    }

    .actions > button {
      flex: 1;
    }
  `,
})
export class FilterSheet {
  protected readonly filters = contentChild.required(TemplateRef);

  readonly active = input(0);
  // Cuántos resultados quedan, si no tiene el pie solo dice "Listo"
  readonly results = input<number>();

  // Unidad de lo que estamos mostrando: cedentes, prendas, etc.
  readonly noun = input('resultados');
  readonly nounOne = input('resultado');
  readonly heading = input('Filtros');

  readonly clear = output<void>();

  protected readonly narrow = mediaQuery(NARROW_SCREEN);
  protected readonly open = signal(false);
  protected readonly filterIcon = SlidersHorizontal;

  protected readonly showLabel = computed(() => {
    const count = this.results();
    if (count === undefined) return 'Listo';
    if (count === 0) return 'Sin resultados';
    return `Ver ${count} ${count === 1 ? this.nounOne() : this.noun()}`;
  });
}
