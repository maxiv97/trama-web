import { Component, computed, input } from '@angular/core';

export type StitchVariant = 'sewn' | 'knot' | 'baste' | 'back';

interface Thread {
  color: string;
  width: number;
  dash: string;
  offset: number;
}

const THREADS: Record<StitchVariant, Thread[]> = {
  sewn: [{ color: 'var(--color-trama-dark)', width: 5, dash: '12 10', offset: 0 }],
  knot: [{ color: 'var(--color-trama-knot)', width: 4, dash: '12 9', offset: 0 }],
  baste: [{ color: 'var(--color-trama-thread-faint)', width: 3, dash: '8 7', offset: 0 }],
  back: [
    { color: 'var(--color-trama-thread-faint)', width: 3, dash: '12 10', offset: -11 },
    { color: 'var(--color-trama-dark)', width: 5, dash: '12 10', offset: 0 },
  ],
};

const KNOT_SIZE = 12;

// Cada instancia necesita su propia máscara para la animación
let nextMaskId = 0;

@Component({
  selector: 'app-stitch',
  host: {
    'aria-hidden': 'true',
    '[class.is-sewing]': 'sew()',
  },
  template: `
    <svg class="thread" width="100%" [attr.height]="height()" overflow="visible">
      @if (sew()) {
        <defs>
          <mask [attr.id]="maskId" maskUnits="userSpaceOnUse">
            <rect
              class="needle"
              x="-6"
              y="-6"
              width="110%"
              [attr.height]="height() + 12"
              fill="white"
            />
          </mask>
        </defs>
      }
      @for (thread of threads(); track $index) {
        <line
          [attr.x1]="thread.width / 2"
          x2="100%"
          [attr.y1]="height() / 2"
          [attr.y2]="height() / 2"
          [style.stroke]="thread.color"
          [attr.stroke-width]="thread.width"
          [attr.stroke-dasharray]="thread.dash"
          [attr.stroke-dashoffset]="thread.offset"
          [attr.mask]="sew() ? 'url(#' + maskId + ')' : null"
          stroke-linecap="round"
        />
      }
    </svg>
    @if (variant() === 'knot') {
      <svg class="knot" [attr.width]="knotSize" [attr.height]="knotSize">
        <circle
          [attr.cx]="knotSize / 2"
          [attr.cy]="knotSize / 2"
          [attr.r]="knotSize / 2"
          style="fill: var(--color-trama-knot)"
        />
      </svg>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-inline-end: 3px;
    }

    .thread {
      flex: 1;
      min-width: 0;
    }

    .knot {
      flex-shrink: 0;
    }

    :host(.is-sewing) .needle {
      transform-box: fill-box;
      transform-origin: left center;
      animation: stitch-sew var(--duration-sew) var(--ease-enter) both;
    }

    :host(.is-sewing) .knot {
      animation: stitch-knot var(--duration-base) var(--ease-bounce) var(--duration-sew) both;
    }

    @keyframes stitch-sew {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }

    @keyframes stitch-knot {
      from {
        transform: scale(0);
      }
      to {
        transform: scale(1);
      }
    }

    @keyframes stitch-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host(.is-sewing) .needle,
      :host(.is-sewing) .knot {
        animation: none;
      }

      :host(.is-sewing) {
        animation: stitch-fade 150ms ease-out both;
      }
    }
  `,
})
export class Stitch {
  readonly variant = input<StitchVariant>('sewn');
  // true: la puntada aparece con animacion
  readonly sew = input(false);

  protected readonly maskId = `trama-stitch-${nextMaskId++}`;
  protected readonly knotSize = KNOT_SIZE;
  protected readonly threads = computed(() => THREADS[this.variant()]);
  protected readonly height = computed(() =>
    this.variant() === 'knot' ? KNOT_SIZE : Math.max(...this.threads().map((t) => t.width)),
  );
}
