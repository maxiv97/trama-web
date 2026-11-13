import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-error-state',
  imports: [RouterLink],
  template: `
    <div class="card" role="alert">
      <svg class="cut-thread" width="150" height="64" viewBox="0 0 150 64" aria-hidden="true">
        <path
          transform="translate(75 32)"
          d="M0,-28 C18,-28 30,-14 28,4 C26,22 12,30 -4,28 C-20,26 -30,12 -28,-6 C-26,-22 -14,-28 0,-28Z"
          style="fill: var(--color-status-none-soft)"
        />
        <path class="thread" d="M8,32 L54,32" stroke-dasharray="10 8" />
        <path class="thread" d="M96,32 L142,32" stroke-dasharray="10 8" stroke-dashoffset="-4" />
        <path class="cut" d="M67,24 L83,40 M83,24 L67,40" />
      </svg>
      <p class="title">{{ title() }}</p>
      <p class="message">{{ message() }}</p>
      @if (link(); as target) {
        <a [routerLink]="target" class="trama-btn trama-btn--small">{{ linkLabel() }}</a>
      } @else {
        <button type="button" class="trama-btn trama-btn--small" (click)="retry.emit()">
          Reintentar
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 16px;
    }

    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      max-width: 420px;
      padding: 24px 20px;
      border-radius: var(--radius-popover);
      background-color: var(--color-trama-sand-50);
      text-align: center;
    }

    .thread {
      fill: none;
      stroke: var(--color-trama-dark);
      stroke-width: 4;
      stroke-linecap: round;
    }

    .cut {
      fill: none;
      stroke: var(--color-trama-red);
      stroke-width: 4;
      stroke-linecap: round;
    }

    .title {
      margin: 0;
      color: var(--color-trama-dark);
      font-family: var(--font-display);
      font-size: 1.125rem; /* 18px */
      font-weight: 700;
    }

    .message {
      margin: 0 0 6px;
      color: var(--color-trama-body);
      font-size: 0.9375rem;
      line-height: 1.5;
    }
  `,
})
export class ErrorState {
  readonly message = input.required<string>();
  readonly title = input('Se cortó el hilo');
  readonly link = input<string>();
  readonly linkLabel = input<string>('Volver');
  readonly retry = output<void>();
}
