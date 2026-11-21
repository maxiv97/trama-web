import { Component, computed, ElementRef, input, model, viewChildren } from '@angular/core';
import { stepByKey } from '../../utils/arrow-keys';

export interface SegmentOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-segmented',
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'ariaLabel() || null',
  },
  template: `
    @for (option of options(); track option.value; let i = $index) {
      <button
        #segment
        type="button"
        role="radio"
        [attr.aria-checked]="option.value === value()"
        [tabindex]="i === tabStop() ? 0 : -1"
        (click)="value.set(option.value)"
        (keydown)="onKey($event, i)"
      >
        {{ option.label }}
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 2px;
      max-width: 100%;
      padding: 4px;
      overflow-x: auto;
      border-radius: 14px;
      background-color: var(--color-trama-sand-50);
      scrollbar-width: none;
    }

    button {
      flex: none;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 10px;
      color: var(--color-trama-dark);
      font-size: 0.875rem;
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--duration-fast),
        color var(--duration-fast);
    }

    button:hover:not([aria-checked='true']) {
      background-color: var(--color-trama-sand-100);
    }

    button[aria-checked='true'] {
      background-color: var(--color-trama-dark);
      color: var(--color-trama-paper);
    }

    button:focus-visible {
      outline: 2px solid var(--color-trama-brand);
      outline-offset: 2px;
    }
  `,
})
export class Segmented {
  private readonly segments = viewChildren<ElementRef<HTMLButtonElement>>('segment');

  readonly options = input.required<readonly SegmentOption[]>();
  readonly value = model('');
  readonly ariaLabel = input<string>();

  protected readonly tabStop = computed(() =>
    Math.max(
      0,
      this.options().findIndex((option) => option.value === this.value()),
    ),
  );

  protected onKey(event: KeyboardEvent, index: number): void {
    const next = stepByKey(event.key, index, this.options().length);
    if (next === null) return;
    event.preventDefault();
    this.value.set(this.options()[next].value);
    this.segments()[next]?.nativeElement.focus();
  }
}
