import { Component, computed, input, signal } from '@angular/core';
import { Seam } from './seam';
import { SeamButton, SeamOutcome } from './seam-button';
import { sewnUntil, stepState, stepStatusText } from './seam-steps';

let nextListId = 0;

@Component({
  selector: 'app-seam-summary',
  imports: [Seam, SeamButton],
  template: `
    <div class="head">
      <p class="where">
        <span class="count">Paso {{ current() + 1 }} de {{ steps().length }}</span>
        <span class="name">{{ steps()[current()] }}</span>
      </p>
      @if (next(); as nextStep) {
        <span class="next">Sigue: {{ nextStep }}</span>
      }
    </div>

    <app-seam
      mini
      aria-hidden="true"
      [steps]="steps()"
      [current]="current()"
      [outcome]="outcome()"
      [radius]="8"
    />

    <button
      type="button"
      class="toggle"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="expanded() ? listId : null"
      (click)="expanded.set(!expanded())"
    >
      {{ expanded() ? 'Ocultar recorrido' : 'Ver recorrido completo' }}
    </button>

    @if (expanded()) {
      <ol class="full" [id]="listId">
        @for (label of steps(); track $index; let i = $index) {
          <li
            [class]="stateOf(i)"
            [class.sewn]="i < sewnTo()"
            [attr.aria-current]="i === current() ? 'step' : null"
          >
            <app-seam-button
              [state]="stateOf(i)"
              [radius]="15"
              [outcome]="i === current() ? outcome() : 'open'"
            />
            <span class="label">{{ label }}</span>
            <span class="sr-only">{{ statusText(i) }}</span>
          </li>
        }
      </ol>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }

    .where {
      display: flex;
      flex-direction: column;
      margin: 0;
    }

    .count {
      color: var(--color-trama-body);
      font-size: 0.8125rem; /* 13px */
      font-weight: 600;
    }

    .name {
      color: var(--color-trama-dark);
      font-family: var(--font-display);
      font-size: 1.25rem; /* 20px */
      font-weight: 800;
      line-height: 1.2;
    }

    .next {
      flex-shrink: 0;
      color: var(--color-trama-muted);
      font-size: 0.8125rem;
    }

    .toggle {
      align-self: flex-start;
      color: var(--color-trama-dark);
      font-size: 0.875rem; /* 14px */
      font-weight: 700;
      text-decoration: underline;
      text-decoration-color: var(--color-trama-knot);
      text-underline-offset: 4px;
      cursor: pointer;
    }

    .toggle:focus-visible {
      outline: 3px solid var(--color-trama-green-50);
      outline-offset: 2px;
      border-radius: 4px;
    }

    .full {
      --button-size: calc(64px * 15 / 22);

      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 4px 0 0;
      list-style: none;
    }

    li {
      position: relative;
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 68px;
      color: var(--color-trama-dark);
      font-size: 0.9375rem; /* 15px */
      font-weight: 600;
    }

    li.current {
      font-weight: 700;
    }

    li.pending {
      color: var(--color-trama-muted);
    }

    li:not(:last-child)::before {
      --thread: var(--color-trama-thread-faint);
      --thread-width: 3px;

      content: '';
      position: absolute;
      top: calc(50% + var(--button-size) / 2 + 2px);
      left: calc(var(--button-size) / 2 - var(--thread-width) / 2);
      width: var(--thread-width);
      height: calc(100% - var(--button-size) - 4px);
      background: linear-gradient(to bottom, var(--thread) 8px, transparent 8px) 0 0 / 100% 12px
        repeat-y;
    }

    li.sewn::before {
      --thread: var(--color-trama-dark);
      --thread-width: 4px;
    }
  `,
})
export class SeamSummary {
  readonly steps = input.required<readonly string[]>();
  readonly current = input.required<number>();
  readonly outcome = input<SeamOutcome>('open');

  protected readonly listId = `trama-seam-list-${nextListId++}`;
  protected readonly expanded = signal(false);
  protected readonly sewnTo = computed(() => sewnUntil(this.current(), this.outcome()));

  protected readonly next = computed(() =>
    this.outcome() === 'open' ? this.steps()[this.current() + 1] : undefined,
  );

  protected stateOf(index: number) {
    return stepState(index, this.current(), this.outcome());
  }

  protected statusText(index: number): string {
    return stepStatusText(index, this.current(), this.outcome());
  }
}
