import { Component, computed, input } from '@angular/core';

export type SeamStepState = 'done' | 'current' | 'pending';

/**
 * Cómo está el proceso: abierto, terminado por su final natural o cerrado
 * en un paso negativo (sin acuerdo, rechazada).
 */
export type SeamOutcome = 'open' | 'complete' | 'negative';

const BASE_RADIUS = 22;
const HALF_BOX = 32;

@Component({
  selector: 'app-seam-button',
  host: {
    'aria-hidden': 'true',
    '[class]': 'state()',
    '[class.complete]': "outcome() === 'complete'",
    '[class.negative]': "outcome() === 'negative'",
  },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="-32 -32 64 64">
      @if (state() === 'current' || outcome() !== 'open') {
        <circle class="ring" r="30" />
      }
      <circle class="face" r="22" />
      <circle class="hole" cx="-6" cy="-6" r="3" />
      <circle class="hole" cx="6" cy="-6" r="3" />
      <circle class="hole" cx="-6" cy="6" r="3" />
      <circle class="hole" cx="6" cy="6" r="3" />
      @if (state() === 'done') {
        <path class="cross" d="M-6 -6 6 6M6 -6-6 6" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    svg {
      display: block;
      overflow: visible;
    }

    .face {
      fill: var(--color-trama-paper);
      stroke: var(--color-trama-thread-faint);
      stroke-width: 3;
    }

    .hole {
      fill: var(--color-trama-thread-faint);
    }

    :host(.done) .face {
      fill: var(--color-trama-dark);
      stroke: var(--color-trama-dark);
    }

    :host(.done) .hole {
      fill: var(--color-trama-gold);
    }

    .cross {
      stroke: var(--color-trama-gold);
      stroke-width: 2;
      stroke-linecap: round;
    }

    .ring {
      fill: none;
      stroke: var(--color-trama-gold);
      stroke-width: 4;
      transform-box: fill-box;
      transform-origin: center;
      animation: ring-pop var(--duration-enter) var(--ease-bounce) 350ms both;
    }

    :host(.complete) .ring {
      stroke: var(--color-trama-brand);
    }

    :host(.negative) .ring {
      stroke: var(--color-trama-red);
    }

    @keyframes ring-pop {
      from {
        transform: scale(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ring {
        animation: none;
      }
    }
  `,
})
export class SeamButton {
  readonly state = input<SeamStepState>('pending');
  readonly radius = input(BASE_RADIUS);
  readonly outcome = input<SeamOutcome>('open');

  protected readonly size = computed(() => (HALF_BOX * 2 * this.radius()) / BASE_RADIUS);
}
