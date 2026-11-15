import { booleanAttribute, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  host: {
    role: 'status',
    '[class.compact]': 'compact()',
  },
  template: `
    <svg class="sewing" viewBox="0 0 300 50" aria-hidden="true">
      <path class="thread underside" d="M6 34H294" />
      <path class="thread" d="M6 34H294" />
      <g transform="translate(160 0)">
        <g class="needle">
          <path d="M14 4 0 34" />
          <ellipse
            class="eye"
            cx="11.6"
            cy="9.5"
            rx="1.4"
            ry="3.2"
            transform="rotate(25 11.6 9.5)"
          />
        </g>
      </g>
    </svg>
    <span class="sr-only">{{ label() }}</span>
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 60vh;
    }

    :host(.compact) {
      min-height: auto;
      padding-block: 24px;
    }

    .sewing {
      width: 240px;
      max-width: 100%;
      height: auto;
      overflow: visible;
    }

    :host(.compact) .sewing {
      width: 160px;
    }

    .thread {
      --dash-start: 0px;

      fill: none;
      stroke: var(--color-trama-dark);
      stroke-width: 5;
      stroke-linecap: round;
      stroke-dasharray: 12 9;
      stroke-dashoffset: var(--dash-start);
      animation: thread-run 1s linear infinite;
    }

    .underside {
      --dash-start: -10.5px;

      stroke: var(--color-trama-thread-faint);
      stroke-width: 3;
    }

    .needle {
      animation: needle-pierce 0.9s ease-in-out infinite;
    }

    .needle path {
      stroke: var(--color-trama-dark);
      stroke-width: 4;
      stroke-linecap: round;
    }

    .eye {
      fill: var(--color-trama-paper);
    }

    @keyframes thread-run {
      to {
        stroke-dashoffset: calc(var(--dash-start) - 21px);
      }
    }

    @keyframes needle-pierce {
      50% {
        transform: translateY(5px);
      }
    }

    @keyframes sewing-breathe {
      50% {
        opacity: 0.55;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .thread,
      .needle {
        animation: none;
      }

      .sewing {
        animation: sewing-breathe 1.4s ease-in-out infinite;
      }
    }
  `,
})
export class LoadingSpinner {
  readonly label = input('Cargando…');
  readonly compact = input(false, { transform: booleanAttribute });
}
