import { booleanAttribute, Component, computed, input } from '@angular/core';
import { ChartPoint, proportions } from './chart-point';

@Component({
  selector: 'app-bar-list',
  host: { '[class.thin]': 'thin()' },
  template: `
    <ul>
      @for (point of points(); track point.label; let i = $index) {
        <li>
          <span class="label">{{ point.label }}</span>
          <span class="track" aria-hidden="true">
            <span
              class="bar"
              [class]="'tone-' + (point.tone ?? 'main')"
              [style.width.%]="widths()[i] * 100"
              [style.--step]="i"
            ></span>
          </span>
          <span class="value">{{ point.display ?? point.value }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      display: grid;
      grid-template-columns: minmax(64px, auto) 1fr auto;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: subgrid;
      align-items: center;
      font-size: 0.875rem; /* 14px */
    }

    .label {
      color: var(--color-trama-body);
    }

    .value {
      color: var(--color-trama-dark);
      font-family: var(--font-display);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .track {
      position: relative;
      display: block;
      height: 16px;
      background: linear-gradient(to right, var(--color-trama-thread-light) 8px, transparent 8px) 0
        50% / 15px 3px repeat-x;
    }

    .bar {
      position: absolute;
      inset-block: 0;
      left: 0;
      border-radius: 999px;
      transform-origin: left center;
      animation: bar-sew var(--duration-enter) var(--ease-enter) both;
      animation-delay: calc(var(--step) * 75ms);
    }

    :host(.thin) .track {
      height: 8px;
      background-size: 15px 2px;
    }

    .tone-main {
      background-color: var(--color-trama-dark);
    }

    .tone-highlight {
      background-color: var(--color-trama-gold);
    }

    .tone-secondary {
      background-color: var(--color-trama-sage);
    }

    .tone-alert {
      background-color: var(--color-trama-red);
    }

    @keyframes bar-sew {
      from {
        transform: scaleX(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
      }
    }
  `,
})
export class BarList {
  readonly points = input.required<readonly ChartPoint[]>();
  readonly thin = input(false, { transform: booleanAttribute });

  protected readonly widths = computed(() => proportions(this.points()));
}
