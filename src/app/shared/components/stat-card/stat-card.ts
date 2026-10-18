import { Component, computed, input } from '@angular/core';
import { Stitch } from '../stitch/stitch';

type StatColor = 'default' | 'green' | 'red';

/**
 * Tarjeta de KPI (handoff §4.9). Solo el KPI destacado de cada pantalla lleva
 * el subrayado naranja cosido (`highlight`). En el dashboard, el principal
 * puede ir sobre verde profundo con la etiqueta en amarillo (`dark`).
 */
@Component({
  selector: 'app-stat-card',
  imports: [Stitch],
  host: { class: 'block' },
  template: `
    <div
      class="flex h-full flex-col gap-1 rounded-2xl p-[18px] sm:p-[22px]"
      [class]="
        dark()
          ? 'bg-trama-dark text-trama-sand-50'
          : highlight()
            ? 'bg-trama-sand-50'
            : 'border border-trama-sand-100 bg-trama-paper'
      "
    >
      <p
        class="text-[13px] font-semibold sm:text-sm"
        [class]="dark() ? 'text-trama-gold' : 'text-trama-body'"
      >
        {{ title() }}
      </p>
      <p class="text-number" [class]="valueClass()">{{ value() }}</p>
      @if (highlight()) {
        <app-stitch class="mt-1.5" variant="knot" [width]="120" [animate]="true" [delay]="300" />
      }
      @if (subtitle()) {
        <p class="mt-0.5 text-[13px]" [class]="dark() ? 'text-trama-sand-50/70' : 'text-trama-body'">
          {{ subtitle() }}
        </p>
      }
    </div>
  `,
})
export class StatCard {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtitle = input<string>();
  readonly color = input<StatColor>('default');
  readonly highlight = input(false);
  readonly dark = input(false);

  protected readonly valueClass = computed(() => {
    if (this.dark()) return 'text-trama-paper';
    return {
      default: 'text-trama-dark',
      green: 'text-trama-green-700',
      red: 'text-status-none',
    }[this.color()];
  });
}
