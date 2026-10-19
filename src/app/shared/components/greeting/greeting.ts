import { Component, computed, input } from '@angular/core';
import { Stitch } from '../stitch/stitch';

/**
 * Saludo del panel (handoff §4.2): "Buen día, {nombre}" en Bricolage 700 con
 * el subrayado naranja que se cose de izquierda a derecha y el nudo al final;
 * debajo, el resumen del día. Entra el nombre (0,1 s), se cose el hilo
 * (0,5 s, 900 ms), aparece el nudo (1,38 s) y entra el resumen (1,65 s).
 */
@Component({
  selector: 'app-greeting',
  imports: [Stitch],
  host: { class: 'block' },
  template: `
    @if (eyebrow()) {
      <p class="text-eyebrow greet-in mb-2.5" style="animation-delay: 0ms">{{ eyebrow() }}</p>
    }
    <h1
      class="greet-in text-balance font-display text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-trama-dark sm:text-[34px]"
      style="animation-delay: 100ms"
    >
      {{ salutation() }}, {{ name() }}
    </h1>
    <app-stitch class="mt-3 max-w-[360px]" variant="knot" [animate]="true" [delay]="500" [duration]="900" />
    @if (summary()) {
      <p class="greet-in mt-3 text-[17px] leading-snug text-trama-body" style="animation-delay: 1650ms">
        {{ summary() }}
      </p>
    }
  `,
  styles: `
    .greet-in {
      animation: t-enter 550ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
    }
  `,
})
export class Greeting {
  readonly name = input.required<string>();
  readonly summary = input('');
  readonly eyebrow = input('');
  /** Hora usada para el saludo; se puede fijar en tests. */
  readonly now = input<Date | null>(null);

  protected readonly salutation = computed(() => {
    const hour = (this.now() ?? new Date()).getHours();
    if (hour >= 5 && hour < 13) return 'Buen día';
    if (hour >= 13 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  });
}
