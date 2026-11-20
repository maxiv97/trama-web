import { Component, computed, input, model } from '@angular/core';
import { ChevronLeft, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { mediaQuery, NARROW_SCREEN } from '../../utils/media-query';

type PageSlot = number | 'gap';

@Component({
  selector: 'app-pager',
  imports: [LucideAngularModule],
  template: `
    <p class="summary" aria-live="polite">Mostrando {{ shown() }} de {{ total() }} {{ noun() }}</p>
    @if (pageCount() > 1) {
      <nav aria-label="Paginación">
        <button
          type="button"
          class="step"
          aria-label="Página anterior"
          [disabled]="page() === 1"
          (click)="go(page() - 1)"
        >
          <lucide-angular [img]="prevIcon" [size]="16" />
        </button>
        @for (slot of slots(); track $index) {
          @if (slot === 'gap') {
            <span class="gap" aria-hidden="true">…</span>
          } @else {
            <button
              type="button"
              [attr.aria-current]="slot === page() ? 'page' : null"
              [attr.aria-label]="'Página ' + slot"
              (click)="go(slot)"
            >
              {{ slot }}
            </button>
          }
        }
        <button
          type="button"
          class="step"
          aria-label="Página siguiente"
          [disabled]="page() === pageCount()"
          (click)="go(page() + 1)"
        >
          <lucide-angular [img]="nextIcon" [size]="16" />
        </button>
      </nav>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .summary {
      margin: 0;
      color: var(--color-trama-body);
      font-size: 0.875rem;
    }

    nav {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      height: 36px;
      padding: 0 8px;
      border-radius: 10px;
      color: var(--color-trama-dark);
      font-size: 0.875rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      transition: background-color var(--duration-fast);
    }

    button:hover:not(:disabled, [aria-current]) {
      background-color: var(--color-trama-sand-50);
    }

    button[aria-current='page'] {
      background-color: var(--color-trama-dark);
      color: var(--color-trama-sand-50);
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    button:focus-visible {
      outline: 3px solid var(--color-trama-green-50);
      outline-offset: 1px;
    }

    .gap {
      min-width: 20px;
      color: var(--color-trama-muted);
      text-align: center;
    }
  `,
})
export class Pager {
  readonly page = model(1);
  readonly pageSize = input(10);
  readonly total = input.required<number>();
  // Que mostramos, ej: prendas, cedentes, etc.
  readonly noun = input('resultados');

  protected readonly prevIcon = ChevronLeft;
  private readonly narrow = mediaQuery(NARROW_SCREEN);
  protected readonly nextIcon = ChevronRight;

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  protected readonly shown = computed(() => {
    const before = (this.page() - 1) * this.pageSize();
    return Math.max(0, Math.min(this.pageSize(), this.total() - before));
  });

  protected readonly slots = computed<PageSlot[]>(() => {
    const count = this.pageCount();
    const current = this.page();
    // En celular no entran las vecinas de la actual: queda 1 … 5 … 10
    const near = this.narrow() ? [] : [current - 1, current + 1];
    const wanted = new Set([1, count, current, ...near]);
    const pages = [...wanted].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
    return pages.flatMap((n, i): PageSlot[] => (i > 0 && n - pages[i - 1] > 1 ? ['gap', n] : [n]));
  });

  protected go(page: number): void {
    this.page.set(Math.min(Math.max(page, 1), this.pageCount()));
  }
}
