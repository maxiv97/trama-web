import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ConfirmColor = 'green' | 'red' | 'blue';

const COLOR_CLASSES: Record<ConfirmColor, string> = {
  green: 'bg-trama-brand hover:bg-trama-green-700',
  red: 'bg-status-none hover:brightness-90',
  blue: 'bg-blue-600 hover:bg-blue-700',
};

@Component({
  selector: 'app-confirm-modal',
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-trama-dark/30 p-4"
        (click)="cancelled.emit()"
      >
        <div class="w-full max-w-md rounded-2xl bg-trama-paper p-6 shadow-lg" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-semibold text-trama-dark">{{ title() }}</h2>
          <p class="mt-2 text-sm text-trama-dark/70">{{ body() }}</p>

          @if (optionalField(); as fieldLabel) {
            <label class="mt-4 block text-sm">
              <span class="text-trama-dark/70">{{ fieldLabel }}</span>
              <input
                [(ngModel)]="fieldValue"
                class="t-input mt-1.5 w-full"
              />
            </label>
          }

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              (click)="cancelled.emit()"
              class="t-btn t-btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirm()"
              class="rounded-lg px-4 py-2 text-sm font-medium text-white"
              [class]="confirmClass()"
            >
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
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
