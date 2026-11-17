import { Component, input } from '@angular/core';
import { VerifiedSeal, VerifiedState } from './verified-seal';

@Component({
  selector: 'app-verified-badge',
  imports: [VerifiedSeal],
  host: { '[class.pending]': "state() === 'pending'" },
  template: `
    <app-verified-seal [size]="18" [state]="state()" />
    {{ label() }}
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px 5px 6px;
      border-radius: 999px;
      background-color: var(--color-trama-green-50);
      color: var(--color-trama-green-700);
      font-size: 0.8125rem;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }

    :host(.pending) {
      background-color: var(--color-trama-sand-50);
      color: var(--color-trama-muted);
    }
  `,
})
export class VerifiedBadge {
  readonly label = input('Verificado');
  readonly state = input<VerifiedState>('verified');
}
