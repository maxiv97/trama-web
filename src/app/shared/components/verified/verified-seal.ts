import { booleanAttribute, Component, computed, input } from '@angular/core';

export type VerifiedState = 'verified' | 'pending';

@Component({
  selector: 'app-verified-seal',
  host: {
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64">
      @switch (shape()) {
        @case ('pending') {
          @if (ringed()) {
            <circle class="paper" cx="32" cy="32" r="31" />
          }
          <circle class="basted" cx="32" cy="32" r="29" pathLength="20" />
          <path
            class="tick pending-tick"
            d="M22.5 32.5l6.5 6.5 12.5-14"
            [attr.stroke-width]="tickWidth()"
          />
        }
        @case ('ringed') {
          <circle class="paper" cx="32" cy="32" r="31" />
          <circle class="patch" cx="32" cy="32" r="26" />
          <path class="tick" d="M21 33l7.5 7.5 15-17" stroke-width="7" />
        }
        @case ('stitched') {
          <circle class="patch" cx="32" cy="32" r="30" />
          <circle
            class="inner-stitch"
            cx="32"
            cy="32"
            r="23.5"
            pathLength="20"
            transform="rotate(-86 32 32)"
          />
          <path class="tick" d="M22.5 32.5l6.5 6.5 12.5-14" [attr.stroke-width]="tickWidth()" />
        }
        @default {
          <circle class="patch" cx="32" cy="32" r="30" />
          <path class="tick" d="M20 33l8 8 16-18" stroke-width="8" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }

    .patch {
      fill: var(--color-trama-brand);
    }

    .paper {
      fill: var(--color-trama-paper);
    }

    .inner-stitch {
      fill: none;
      stroke: var(--color-trama-paper);
      stroke-width: 2.2;
      stroke-dasharray: 0.42 0.58;
    }

    .basted {
      fill: none;
      stroke: var(--color-trama-thread-faint);
      stroke-width: 3;
      stroke-dasharray: 0.5 0.5;
    }

    .tick {
      fill: none;
      stroke: var(--color-trama-paper);
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .pending-tick {
      stroke: var(--color-trama-thread-faint);
    }
  `,
})
export class VerifiedSeal {
  readonly size = input(18);
  readonly state = input<VerifiedState>('verified');
  readonly ringed = input(false, { transform: booleanAttribute });
  readonly label = input<string>();

  protected readonly shape = computed(() => {
    if (this.state() === 'pending') return 'pending';
    if (this.ringed()) return 'ringed';
    return this.size() >= 32 ? 'stitched' : 'plain';
  });

  protected readonly tickWidth = computed(() => {
    if (this.state() === 'pending') return this.size() >= 32 ? 5 : 7;
    return this.size() >= 48 ? 4.5 : 6;
  });
}
