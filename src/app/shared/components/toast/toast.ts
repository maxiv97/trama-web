import { Component, inject } from '@angular/core';
import { TOAST_DURATION_MS, ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="stack" aria-live="polite">
      @for (toast of toastService.messages(); track toast.id) {
        <div
          class="toast"
          [class]="'is-' + toast.type"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
        >
          <div class="content">
            <span class="badge" aria-hidden="true">
              @switch (toast.type) {
                @case ('error') {
                  <svg width="20" height="20" viewBox="0 0 16 16">
                    <path d="M2 8h3.5M10.5 8H14M6.5 5.5l3 5M9.5 5.5l-3 5" stroke-width="1.8" />
                  </svg>
                }
                @case ('warning') {
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <path
                      d="M2 11c2-3 4-3 6 0s4 3 6 0 3-2 4-1"
                      stroke-width="1.8"
                      stroke-dasharray="3 2.4"
                    />
                  </svg>
                }
                @default {
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.5" />
                  </svg>
                }
              }
            </span>
            <span class="text">
              <span class="title">{{ toast.text }}</span>
              @if (toast.detail) {
                <span class="detail">{{ toast.detail }}</span>
              }
            </span>
          </div>
          <svg class="timer" width="100%" height="4" aria-hidden="true" overflow="visible">
            <defs>
              <mask [attr.id]="'toast-timer-' + toast.id" maskUnits="userSpaceOnUse">
                <rect
                  class="remaining"
                  x="-4"
                  y="-4"
                  width="110%"
                  height="12"
                  fill="white"
                  [style.animation-duration.ms]="duration"
                />
              </mask>
            </defs>
            <line
              x1="2"
              x2="100%"
              y1="2"
              y2="2"
              [attr.mask]="'url(#toast-timer-' + toast.id + ')'"
            />
          </svg>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: min(360px, calc(100vw - 32px));
    }

    .toast {
      --toast-color: var(--color-trama-brand);
      --toast-soft: var(--color-trama-green-50);

      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 16px 18px 12px;
      border-radius: var(--radius-popover);
      background-color: var(--color-trama-paper);
      box-shadow: var(--shadow-toast);
      animation: toast-enter var(--duration-enter) var(--ease-enter) both;
    }

    .is-error {
      --toast-color: var(--color-trama-red);
      --toast-soft: var(--color-status-none-soft);
    }

    .is-warning {
      --toast-color: var(--color-status-pending);
      --toast-soft: var(--color-status-pending-soft);
    }

    .content {
      display: flex;
      gap: 12px;
    }

    .badge {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: var(--toast-soft);
    }

    .badge path {
      fill: none;
      stroke: var(--toast-color);
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .title {
      color: var(--color-trama-dark);
      font-size: 0.9375rem; /* 15px */
      font-weight: 700;
    }

    .detail {
      color: var(--color-trama-body);
      font-size: 0.875rem; /* 14px */
    }

    /* El hilo se descose de derecha a izquierda: lo que queda es el tiempo restante.
       Se achica la máscara, no el hilo, así las puntadas no se deforman. */
    .timer line {
      stroke: var(--toast-color);
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-dasharray: 6 5;
    }

    .timer .remaining {
      transform-box: fill-box;
      transform-origin: left center;
      animation: toast-unsew linear both;
    }

    @keyframes toast-enter {
      from {
        opacity: 0;
        transform: translateX(24px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @keyframes toast-unsew {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }

    @keyframes toast-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Movimiento reducido: entra con un fundido y el hilo queda quieto */
    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation: toast-fade 150ms ease-out both;
      }

      .timer .remaining {
        animation: none;
      }
    }
  `,
})
export class Toast {
  protected readonly toastService = inject(ToastService);
  protected readonly duration = TOAST_DURATION_MS;
}
