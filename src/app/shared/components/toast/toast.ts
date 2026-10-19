import { Component, inject } from '@angular/core';
import { TOAST_DISMISS_MS, ToastService, ToastType } from './toast.service';

interface ToastTone {
  color: string;
  soft: string;
}

const TONES: Record<ToastType, ToastTone> = {
  success: { color: '#2E7D54', soft: '#DCEDDF' },
  error: { color: '#C0392B', soft: '#F7DEDB' },
  warning: { color: '#9A6B12', soft: '#F7EBD2' },
};

/**
 * Toast (handoff §4.10): fondo claro, ícono por tipo dentro de un círculo
 * suave y un hilo abajo que se descose en 5 s para marcar el tiempo que queda.
 */
@Component({
  selector: 'app-toast',
  template: `
    <div
      class="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3"
      aria-live="polite"
    >
      @for (toast of toastService.messages(); track toast.id) {
        <div
          class="toast pointer-events-auto flex flex-col overflow-hidden rounded-2xl bg-trama-paper shadow-[0_10px_30px_rgba(31,58,43,.12)]"
          [attr.role]="toast.type === 'error' ? 'alert' : 'status'"
        >
          <div class="flex items-start gap-3 px-[18px] pb-3 pt-4">
            <span
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              [style.background]="tone(toast.type).soft"
            >
              @switch (toast.type) {
                @case ('success') {
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="#2E7D54" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path class="draw" d="M4 10.5 8.5 15 16 5.5" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" />
                  </svg>
                }
                @case ('error') {
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="#C0392B" stroke-width="2.4" stroke-linecap="round">
                    <path d="M2 10h4.5 M13.5 10H18 M8 6.5l4 7 M12 6.5l-4 7" />
                  </svg>
                }
                @default {
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="#9A6B12" stroke-width="2.4" stroke-linecap="round">
                    <path d="M2 10c2-3 3.5-3 5.3 0s3.5 3 5.4 0 3.5-3 5.3 0" stroke-dasharray="3 2.6" />
                  </svg>
                }
              }
            </span>
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="text-[15px] font-bold text-trama-dark">{{ toast.title }}</span>
              @if (toast.body) {
                <span class="text-sm leading-snug text-trama-body">{{ toast.body }}</span>
              }
            </div>
            <button
              type="button"
              class="-mr-1 -mt-1 rounded-lg p-1 text-trama-muted hover:bg-trama-sand-50 hover:text-trama-dark"
              aria-label="Cerrar"
              (click)="toastService.dismiss(toast.id)"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>
          <svg viewBox="0 0 300 8" preserveAspectRatio="none" class="block h-2 w-full" aria-hidden="true">
            <defs>
              <mask [attr.id]="'tm' + toast.id" maskUnits="userSpaceOnUse">
                <rect class="unstitch" width="300" height="8" fill="#fff" [style.animation-duration.ms]="dismissMs" />
              </mask>
            </defs>
            <path
              d="M10,4 L290,4"
              [attr.stroke]="tone(toast.type).color"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray="9 7"
              [attr.mask]="'url(#tm' + toast.id + ')'"
            />
          </svg>
        </div>
      }
    </div>
  `,
  styles: `
    .toast {
      animation: t-slide-in-right 450ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
    }
    .draw {
      animation: t-draw 500ms ease-out 250ms both;
    }
    .unstitch {
      transform-box: fill-box;
      transform-origin: 0 0;
      animation: toast-unstitch linear both;
    }
    @keyframes toast-unstitch {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }
  `,
})
export class Toast {
  protected readonly toastService = inject(ToastService);
  protected readonly dismissMs = TOAST_DISMISS_MS;

  protected tone(type: ToastType): ToastTone {
    return TONES[type];
  }
}
