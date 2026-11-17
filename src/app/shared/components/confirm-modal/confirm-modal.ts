import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Verde para confirmar, rojo para lo que no se puede deshacer (rechazar, cancelar). */
export type ConfirmColor = 'green' | 'red';

let nextTitleId = 0;

@Component({
  selector: 'app-confirm-modal',
  imports: [FormsModule],
  host: { '(document:keydown.escape)': 'closeWithEscape()' },
  template: `
    @if (open()) {
      <div class="overlay" (click)="cancelled.emit()">
        <div
          class="dialog trama-inner-stitch"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          (click)="$event.stopPropagation()"
        >
          <h2 class="title" [id]="titleId">{{ title() }}</h2>
          <p class="body">{{ body() }}</p>

          @if (optionalField(); as fieldLabel) {
            <label class="trama-field">
              <span class="trama-label">{{ fieldLabel }}</span>
              <input class="trama-input" [(ngModel)]="fieldValue" />
            </label>
          }

          <div class="actions">
            <button type="button" class="trama-btn trama-btn--ghost" (click)="cancelled.emit()">
              Cancelar
            </button>
            <button
              type="button"
              class="trama-btn"
              [class.trama-btn--danger]="confirmColor() === 'red'"
              (click)="confirm()"
            >
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background-color: var(--color-trama-overlay);
      animation: modal-fade var(--duration-base) ease-out both;
    }

    .dialog {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-width: 440px;
      padding: 28px;
      border-radius: var(--radius-card);
      background-color: var(--color-trama-paper);
      box-shadow: var(--shadow-elevated);
      animation: modal-enter var(--duration-base) var(--ease-enter) both;
    }

    .title {
      margin: 0;
      color: var(--color-trama-dark);
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 700;
    }

    .body {
      margin: 0;
      color: var(--color-trama-body);
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 6px;
    }

    @keyframes modal-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes modal-enter {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .dialog {
        animation: modal-fade 150ms ease-out both;
      }
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

  protected readonly titleId = `confirm-modal-title-${nextTitleId++}`;
  protected fieldValue = '';

  protected confirm(): void {
    const value = this.optionalField() ? this.fieldValue.trim() || undefined : undefined;
    this.confirmed.emit(value);
  }

  protected closeWithEscape(): void {
    if (this.open()) this.cancelled.emit();
  }
}
