import { Component, computed, input } from '@angular/core';

type StatColor = 'default' | 'green' | 'red';

@Component({
  selector: 'app-stat-card',
  template: `
    <div class="rounded-2xl border border-trama-sand-200 bg-white p-5">
      <p class="text-sm text-trama-dark/60">{{ title() }}</p>
      <p class="mt-1 font-display text-2xl font-semibold" [class]="valueClass()">{{ value() }}</p>
      @if (subtitle()) {
        <p class="mt-1 text-xs text-trama-dark/50">{{ subtitle() }}</p>
      }
    </div>
  `,
})
export class StatCard {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtitle = input<string>();
  readonly color = input<StatColor>('default');

  protected readonly valueClass = computed(
    () =>
      ({
        default: 'text-trama-dark',
        green: 'text-trama-green-700',
        red: 'text-status-none',
      })[this.color()],
  );
}
