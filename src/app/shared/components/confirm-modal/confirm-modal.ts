import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ConfirmColor = 'green' | 'red';

const COLOR_CLASSES: Record<ConfirmColor, string> = {
  green: 't-btn-primary',
  red: 't-btn-danger',
};

/**
 * Modal de confirmación (handoff §4.11): papel con un pespunte alrededor de
 * todo el modal. Solo verde (acción) y rojo (destructiva); no hay azul.
 */
@Component({
  selector: 'app-confirm-modal',
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div
        class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-trama-dark/30 p-4"
        (click)="cancelled.emit()"
      >
        <div
          class="modal-panel relative w-full max-w-md rounded-[20px] bg-trama-paper p-7 shadow-[0_20px_60px_rgba(31,58,43,.14)]"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          (click)="$event.stopPropagation()"
        >
          <svg class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <rect
              x="9"
              y="9"
              rx="13"
              style="width: calc(100% - 18px); height: calc(100% - 18px)"
              fill="none"
              stroke="#C9C2AE"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-dasharray="10 8"
            />
          </svg>
          <div class="relative">
            <h2 class="text-title-2 text-trama-dark">{{ title() }}</h2>
            <p class="mt-2 text-[15px] leading-relaxed text-trama-body">{{ body() }}</p>

            @if (optionalField(); as fieldLabel) {
              <label class="mt-5 block">
                <span class="t-label">{{ fieldLabel }}</span>
                <input [(ngModel)]="fieldValue" class="t-input" />
              </label>
            }

            <div class="mt-7 flex justify-end gap-3">
              <button type="button" (click)="cancelled.emit()" class="t-btn t-btn-ghost">
                Cancelar
              </button>
              <button type="button" (click)="confirm()" class="t-btn" [class]="confirmClass()">
                {{ confirmLabel() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .modal-overlay {
      animation: t-fade 250ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
    }
    .modal-panel {
      animation: t-pop-in 250ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
    }
  `,
})
export class ConfirmModal {
  readonly open = input(false);
  readonly title = input('');
  readonly body = input('');
  readonly confirmLabel = input('Confirmar');
  readonly confirmColor = input<ConfirmColor>('green');
  readonly optionalField = input<string | undefined>(undefined);

  readonly confirmed = output<string | undefined>();
  readonly cancelled = output<void>();

  protected fieldValue = '';

  protected confirm(): void {
    const value = this.optionalField() ? this.fieldValue.trim() || undefined : undefined;
    this.confirmed.emit(value);
  }

  protected confirmClass(): string {
    return COLOR_CLASSES[this.confirmColor()];
  }
}
