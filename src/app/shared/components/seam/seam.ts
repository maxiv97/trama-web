import { booleanAttribute, Component, computed, input } from '@angular/core';
import { Stitch } from '../stitch/stitch';
import { SeamButton, SeamOutcome } from './seam-button';
import { sewnUntil, stepState, stepStatusText } from './seam-steps';

@Component({
  selector: 'app-seam',
  imports: [Stitch, SeamButton],
  host: {
    '[class.mini]': 'mini()',
    '[style.--seam-steps]': 'steps().length',
    '[style.--seam-box.px]': 'boxSize()',
  },
  template: `
    <div class="track" aria-hidden="true">
      @if (pendingFrom() < steps().length - 1) {
        <svg
          class="basted"
          [style.left]="segment(pendingFrom())"
          [style.width]="span(pendingFrom(), steps().length - 1)"
          height="4"
        >
          <line x1="2" x2="100%" y1="2" y2="2" />
        </svg>
      }
      @if (pendingFrom() > 0) {
        <div class="sewn" [style.left]="segment(0)" [style.width]="span(0, pendingFrom())">
          @if (mini()) {
            <svg class="mini-thread" height="3">
              <line x1="1.5" x2="100%" y1="1.5" y2="1.5" />
            </svg>
          } @else {
            <app-stitch variant="back" [sew]="true" />
          }
        </div>
      }
    </div>
    <ol class="steps">
      @for (label of steps(); track $index; let i = $index) {
        <li [class]="stateOf(i)" [attr.aria-current]="i === current() ? 'step' : null">
          <app-seam-button
            [state]="stateOf(i)"
            [radius]="radius()"
            [outcome]="i === current() ? outcome() : 'open'"
          />
          <span [class]="mini() ? 'sr-only' : 'label'">{{ label }}</span>
          <span class="sr-only">{{ statusText(i) }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    :host {
      --duration-sew: 1.7s;

      position: relative;
      display: block;
    }

    .track {
      position: absolute;
      inset-inline: 0;
      top: calc(var(--seam-box) / 2);
    }

    .track > * {
      position: absolute;
      top: 0;
      translate: 0 -50%;
    }

    .sewn {
      transition: width 0.6s var(--ease-enter);
    }

    .basted line {
      stroke: var(--color-trama-thread-faint);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-dasharray: 12 10;
    }

    :host(.mini) .basted line {
      stroke-width: 2.5;
      stroke-dasharray: 6 5;
    }

    .mini-thread {
      display: block;
      width: 100%;
    }

    .mini-thread line {
      stroke: var(--color-trama-dark);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-dasharray: 6 5;
    }

    .steps {
      position: relative;
      display: grid;
      grid-template-columns: repeat(var(--seam-steps), minmax(0, 1fr));
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding-inline: 4px;
      text-align: center;
    }

    :host(.mini) li {
      padding-inline: 0;
    }

    .label {
      color: var(--color-trama-dark);
      font-size: 0.9375rem;
      font-weight: 600;
      line-height: 1.25;
    }

    .current .label {
      font-weight: 700;
    }

    .pending .label {
      color: var(--color-trama-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .sewn {
        transition: none;
      }
    }
  `,
})
export class Seam {
  readonly steps = input.required<readonly string[]>();
  readonly current = input.required<number>();
  readonly outcome = input<SeamOutcome>('open');
  readonly radius = input(22);
  readonly mini = input(false, { transform: booleanAttribute });

  protected readonly boxSize = computed(() => (64 * this.radius()) / 22);
  protected readonly pendingFrom = computed(() => sewnUntil(this.current(), this.outcome()));

  protected stateOf(index: number) {
    return stepState(index, this.current(), this.outcome());
  }

  protected statusText(index: number): string {
    return stepStatusText(index, this.current(), this.outcome());
  }

  protected segment(index: number): string {
    return `calc(100% / var(--seam-steps) * ${index + 0.5})`;
  }

  protected span(from: number, to: number): string {
    return `calc(100% / var(--seam-steps) * ${to - from})`;
  }
}
