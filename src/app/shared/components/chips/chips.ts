import { Component, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ChipOption {
  value: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'app-chips',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Chips), multi: true }],
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-disabled]': 'disabled() || null',
  },
  template: `
    @for (option of options(); track option.value; let i = $index) {
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="option.value === value()"
        [tabindex]="tabStop() === i ? 0 : -1"
        [disabled]="disabled()"
        (click)="choose(option.value)"
        (keydown)="onKey($event, i)"
      >
        {{ option.label }}
        @if (option.count !== undefined) {
          <span class="count">{{ option.count }}</span>
        }
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      padding: 8px 14px;
      border: 1.5px solid var(--color-trama-thread-light);
      border-radius: 999px;
      background-color: transparent;
      color: var(--color-trama-dark);
      font-size: 0.875rem; /* 14px */
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--duration-fast),
        border-color var(--duration-fast),
        color var(--duration-fast);
    }

    button:hover:not([aria-checked='true']) {
      border-color: var(--color-trama-dark);
    }

    button[aria-checked='true'] {
      border-color: var(--color-trama-dark);
      background-color: var(--color-trama-dark);
      color: var(--color-trama-sand-50);
    }

    button:focus-visible {
      outline: 3px solid var(--color-trama-green-50);
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background-color: var(--color-trama-sand-50);
      color: var(--color-trama-dark);
      font-size: 0.75rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    button[aria-checked='true'] .count {
      background-color: var(--color-trama-gold);
    }
  `,
})
export class Chips implements ControlValueAccessor {
  readonly options = input.required<readonly ChipOption[]>();
  readonly value = model<string | null>(null);
  readonly ariaLabel = input<string>();

  protected readonly disabled = signal(false);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  // Accion para elegir chip con tab
  protected tabStop(): number {
    return Math.max(
      this.options().findIndex((option) => option.value === this.value()),
      0,
    );
  }

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected choose(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  protected onKey(event: KeyboardEvent, index: number): void {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const options = this.options();
    const next = (index + step + options.length) % options.length;
    this.choose(options[next].value);
    const group = (event.currentTarget as HTMLElement).parentElement;
    group?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  }
}
