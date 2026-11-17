import { booleanAttribute, Component, input } from '@angular/core';
import { Stitch } from '../stitch/stitch';

type StatColor = 'default' | 'green' | 'red';

@Component({
  selector: 'app-stat-card',
  imports: [Stitch],
  host: {
    '[class.featured]': 'featured()',
    '[class]': "'tone-' + color()",
  },
  template: `
    <p class="label">{{ title() }}</p>
    <p class="trama-number value">{{ value() }}</p>
    @if (featured()) {
      <app-stitch class="underline" variant="knot" [sew]="true" />
    }
    @if (subtitle()) {
      <p class="note">{{ subtitle() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 18px;
      border: 1px solid var(--color-trama-sand-100);
      border-radius: var(--radius-popover);
      background-color: var(--color-trama-paper);
    }

    :host(.featured) {
      border-color: transparent;
      background-color: var(--color-trama-sand-50);
    }

    p {
      margin: 0;
    }

    .label {
      color: var(--color-trama-body);
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .value {
      color: var(--color-trama-dark);
    }

    :host(.tone-green) .value {
      color: var(--color-status-agreed);
    }

    :host(.tone-red) .value {
      color: var(--color-status-none);
    }

    .underline {
      width: 120px;
      max-width: 100%;
    }

    .note {
      color: var(--color-trama-body);
      font-size: 0.8125rem;
    }
  `,
})
export class StatCard {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtitle = input<string>();
  readonly color = input<StatColor>('default');
  readonly featured = input(false, { transform: booleanAttribute });
}
