import { Component, computed, input, output } from '@angular/core';

/*
 * Gráficos de Trama (handoff §4.13). Siguen siendo barras de HTML, sin ejes ni
 * grillas: verde profundo para la serie principal, amarillo solo para el dato
 * que importa, rojo solo como alerta y lo vacío hilvanado. Las barras se cosen
 * al entrar, una tras otra con 70–80 ms de diferencia.
 */

export interface BarDatum {
  label: string;
  value: number;
  /** Texto del valor; si falta se usa el número. */
  display?: string;
  /** Pinta la barra de rojo (alerta). */
  alert?: boolean;
  /** Pinta la barra de amarillo (el dato que importa). */
  accent?: boolean;
}

/** Barras horizontales gruesas con pista hilvanada (¿Qué stock no rota?). */
@Component({
  selector: 'app-bar-rows',
  host: { class: 'block' },
  template: `
    <div class="space-y-3">
      @for (d of data(); track d.label; let i = $index) {
        <button
          type="button"
          class="row grid w-full items-center gap-3 rounded-lg text-left"
          [style.grid-template-columns]="labelWidth() + 'px 1fr auto'"
          [disabled]="!clickable() || !d.value"
          [attr.aria-label]="d.label + ': ' + (d.display ?? d.value)"
          (click)="pick.emit(d.label)"
        >
          <span class="truncate text-right text-sm text-trama-body">{{ d.label }}</span>
          <span class="relative flex h-4 items-center">
            <span class="baste-track absolute inset-x-1 top-1/2 -translate-y-1/2"></span>
            <span
              class="grow-x relative block h-4 rounded-full"
              [class]="d.alert ? 'bg-status-none' : d.accent ? 'bg-trama-gold' : 'bg-trama-dark'"
              [style.width.%]="pct(d)"
              [class.invisible]="!d.value"
              [style.animation-delay.ms]="150 + i * 80"
            ></span>
          </span>
          <span
            class="min-w-8 font-display text-[15px] font-bold tabular-nums"
            [class]="d.alert ? 'text-status-none' : 'text-trama-dark'"
            >{{ d.display ?? d.value }}</span
          >
        </button>
      }
    </div>
  `,
  styles: `
    .row:disabled {
      cursor: default;
    }
    .row:not(:disabled):hover .grow-x {
      filter: brightness(1.25);
    }
    .baste-track {
      height: 3px;
      background-image: linear-gradient(to right, #d6cfbb 8px, transparent 8px);
      background-size: 15px 3px;
      background-repeat: repeat-x;
      border-radius: 2px;
    }
    .grow-x {
      min-width: 14px;
      transform-origin: left center;
      animation: t-sew 700ms cubic-bezier(0.3, 0.9, 0.3, 1) both;
    }
  `,
})
export class BarRows {
  readonly data = input.required<BarDatum[]>();
  /** Cada fila se puede tocar para ver el detalle (emite la etiqueta). */
  readonly clickable = input(false);
  readonly pick = output<string>();
  readonly labelWidth = input(64);
  protected readonly max = computed(() => Math.max(1, ...this.data().map((d) => d.value)));
  protected pct(d: BarDatum): number {
    return d.value ? Math.max(3, (d.value / this.max()) * 100) : 0;
  }
}

/** Barras finas de 8 px en salvia, la primera en amarillo (categorías, discrepancias). */
@Component({
  selector: 'app-bar-thin',
  host: { class: 'block' },
  template: `
    <div class="space-y-3.5">
      @for (d of data(); track d.label; let i = $index) {
        <div class="grid items-center gap-3" [style.grid-template-columns]="labelWidth() ? labelWidth() + 'px 1fr auto' : '1fr'">
          @if (labelWidth()) {
            <span class="truncate text-right text-sm" [class]="i === 0 && accentFirst() ? 'font-bold text-trama-dark' : 'font-medium text-trama-dark'">{{ d.label }}</span>
          } @else {
            <span class="flex items-baseline justify-between gap-3 text-sm">
              <span class="truncate" [class]="i === 0 && accentFirst() ? 'font-bold text-trama-dark' : 'font-medium text-trama-body'">{{ d.label }}</span>
              <span class="font-display text-[15px] font-bold tabular-nums text-trama-dark">{{ d.display ?? d.value }}</span>
            </span>
          }
          <span class="relative flex h-2 items-center" [class.mt-0.5]="!labelWidth()">
            <span class="baste-track absolute inset-x-1 top-1/2 -translate-y-1/2"></span>
            <span
              class="grow-x relative block h-2 rounded-full"
              [class]="d.alert ? 'bg-status-none' : (i === 0 && accentFirst()) || d.accent ? 'bg-trama-gold' : 'bg-trama-sage'"
              [style.width.%]="pct(d)"
              [class.invisible]="!d.value"
              [style.animation-delay.ms]="150 + i * 80"
            ></span>
          </span>
          @if (labelWidth()) {
            <span class="font-display text-[15px] font-bold tabular-nums text-trama-dark">{{ d.display ?? d.value }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .baste-track {
      height: 2.5px;
      background-image: linear-gradient(to right, #d6cfbb 7px, transparent 7px);
      background-size: 13px 2.5px;
      background-repeat: repeat-x;
    }
    .grow-x {
      min-width: 8px;
      transform-origin: left center;
      animation: t-sew 700ms cubic-bezier(0.3, 0.9, 0.3, 1) both;
    }
  `,
})
export class BarThin {
  readonly data = input.required<BarDatum[]>();
  /** 0 = etiqueta y valor arriba de la barra. */
  readonly labelWidth = input(0);
  readonly accentFirst = input(true);
  protected readonly max = computed(() => Math.max(1, ...this.data().map((d) => d.value)));
  protected pct(d: BarDatum): number {
    return d.value ? Math.max(2, (d.value / this.max()) * 100) : 0;
  }
}

/** Barras verticales (ventas por semana): la actual en amarillo con su valor arriba. */
@Component({
  selector: 'app-bar-columns',
  host: { class: 'block' },
  template: `
    <div class="relative flex items-end justify-between gap-2" [style.height.px]="height() + 26">
      @for (d of data(); track d.label; let i = $index; let last = $last) {
        <div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
          @if (d.accent || (last && accentLast())) {
            <span class="fade-up mb-1.5 font-display text-base font-extrabold tabular-nums text-trama-dark" [style.animation-delay.ms]="600 + i * 70">{{ d.display ?? d.value }}</span>
          }
          <span
            class="grow-y block w-full max-w-[38px] rounded-t-[10px]"
            [class]="d.accent || (last && accentLast()) ? 'bg-trama-gold' : 'bg-trama-dark'"
            [style.height.px]="barHeight(d)"
            [style.animation-delay.ms]="150 + i * 70"
          ></span>
        </div>
      }
    </div>
    <div class="baste-base mt-0"></div>
    <div class="mt-2 flex justify-between gap-2">
      @for (d of data(); track d.label; let last = $last) {
        <span
          class="flex-1 truncate text-center text-[13px]"
          [class]="d.accent || (last && accentLast()) ? 'font-bold text-trama-dark' : 'font-medium text-trama-muted'"
          >{{ d.label }}</span
        >
      }
    </div>
  `,
  styles: `
    .baste-base {
      height: 3px;
      background-image: linear-gradient(to right, #1f3a2b 9px, transparent 9px);
      background-size: 16px 3px;
      background-repeat: repeat-x;
    }
    .grow-y {
      transform-origin: bottom center;
      animation: t-grow-y 600ms cubic-bezier(0.3, 1.2, 0.4, 1) both;
    }
    .fade-up {
      animation: t-enter 400ms ease both;
    }
  `,
})
export class BarColumns {
  readonly data = input.required<BarDatum[]>();
  readonly height = input(150);
  readonly accentLast = input(true);
  protected readonly max = computed(() => Math.max(1, ...this.data().map((d) => d.value)));
  protected barHeight(d: BarDatum): number {
    return d.value ? Math.max(6, Math.round((d.value / this.max()) * this.height())) : 0;
  }
}

export interface StackSegment {
  label: string;
  value: number;
  display: string;
  color: string;
}

/** Barra apilada de 22 px con segmentos pill separados por 6 px (¿Cuánto debo?, comisión). */
@Component({
  selector: 'app-stacked-bar',
  host: { class: 'block' },
  template: `
    <div class="flex gap-1.5" [style.height.px]="thickness()">
      @for (s of visible(); track s.label; let i = $index) {
        <span
          class="grow-x block h-full rounded-full"
          [style.flex-grow]="s.value"
          [style.flex-basis.px]="0"
          [style.min-width.px]="thickness()"
          [style.background]="s.color"
          [style.animation-delay.ms]="150 + i * 300"
        ></span>
      }
    </div>
    @if (legend()) {
      <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        @for (s of segments(); track s.label) {
          <span class="inline-flex items-center gap-2 text-sm text-trama-body">
            <span class="h-2.5 w-2.5 rounded-full" [style.background]="s.color"></span>
            {{ s.label }}
            <span class="font-display font-bold tabular-nums text-trama-dark">{{ s.display }}</span>
          </span>
        }
      </div>
    }
  `,
  styles: `
    .grow-x {
      transform-origin: left center;
      animation: t-sew 550ms cubic-bezier(0.3, 0.9, 0.3, 1) both;
    }
  `,
})
export class StackedBar {
  readonly segments = input.required<StackSegment[]>();
  readonly thickness = input(22);
  readonly legend = input(true);
  protected readonly visible = computed(() => this.segments().filter((s) => s.value > 0));
}
