import { Component, computed, input } from '@angular/core';
import { ChartPoint, proportions } from './chart-point';

@Component({
  selector: 'app-column-chart',
  template: `
    <ol>
      @for (point of points(); track point.label; let i = $index) {
        <li [title]="point.label + ': ' + text(point)">
          <span class="slot" aria-hidden="true">
            @if (point.tone === 'highlight') {
              <span class="value">{{ text(point) }}</span>
            }
            <span
              class="bar"
              [class]="'tone-' + (point.tone ?? 'main')"
              [style.height.%]="heights()[i] * 100"
              [style.--step]="i"
            ></span>
          </span>
          <span class="label">{{ point.label }}</span>
          <span class="sr-only">{{ text(point) }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    ol {
      position: relative;
      display: flex;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    ol::after {
      content: '';
      position: absolute;
      top: 120px;
      inset-inline: 0;
      height: 3px;
      background: linear-gradient(to right, var(--color-trama-dark) 12px, transparent 12px) 0 0 /
        21px 3px repeat-x;
    }

    li {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .slot {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      width: 100%;
      height: 120px;
    }

    .label {
      margin-top: 3px;
    }

    .bar {
      width: 100%;
      max-width: 34px;
      border-radius: 10px 10px 0 0;
      transform-origin: bottom center;
      animation: column-sew var(--duration-enter) var(--ease-enter) both;
      animation-delay: calc(var(--step) * 75ms);
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

    .value {
      color: var(--color-trama-dark);
      font-family: var(--font-display);
      font-size: 0.8125rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .label {
      color: var(--color-trama-muted);
      font-size: 0.75rem;
      white-space: nowrap;
    }

    @keyframes column-sew {
      from {
        transform: scaleY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .bar {
        animation: none;
      }
    }
  `,
})
export class ColumnChart {
  readonly points = input.required<readonly ChartPoint[]>();

  protected readonly heights = computed(() => proportions(this.points()).map((h) => h * 0.8));

  protected text(point: ChartPoint): string {
    return point.display ?? String(point.value);
  }
}
