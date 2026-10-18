import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

let nextId = 0;

/**
 * Costura de pasos (handoff §4.7 y §6): cada paso es un botón de costura
 * (círculo con cuatro agujeros). Hecho: relleno verde profundo, agujeros y cruz
 * de hilo amarillos. Actual: crema con anillo amarillo (rojo si el resultado es
 * negativo). Pendiente: crema sin anillo. El tramo hecho es hilo cosido con el
 * revés claro debajo y se cose al entrar; el pendiente es un hilván.
 *
 * La usan `app-progress-tracker` (r 22) y `app-wizard-shell` (r 18).
 */
@Component({
  selector: 'app-seam',
  host: { class: 'block' },
  template: `
    <div class="relative" [style.height.px]="height()">
      <svg [attr.width]="width()" [attr.height]="svgHeight()" class="absolute left-0 top-0 block overflow-visible" aria-hidden="true">
        @if (width() > 0) {
          <!-- hilván pendiente -->
          @if (c() < steps().length - 1) {
            <path
              [attr.d]="'M' + xs()[c()] + ',' + cy() + ' L' + xs()[steps().length - 1] + ',' + cy()"
              stroke="#C9C2AE"
              stroke-width="4"
              stroke-linecap="round"
              stroke-dasharray="12 10"
            />
          }
          @if (c() > 0) {
            <!-- revés del hilo -->
            <path
              [attr.d]="donePath()"
              stroke="#C9C2AE"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray="12 10"
              stroke-dashoffset="-11"
            />
            <defs>
              <clipPath [attr.id]="clipId">
                <rect
                  [attr.x]="xs()[0] - 12"
                  [attr.y]="cy() - 12"
                  height="24"
                  class="seam-reveal"
                  [style.width.px]="revealed()"
                  [style.transition-duration.ms]="revealMs()"
                />
              </clipPath>
            </defs>
            <!-- hilo cosido -->
            <path
              [attr.d]="donePath()"
              stroke="#1F3A2B"
              stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray="12 10"
              [attr.clip-path]="'url(#' + clipId + ')'"
            />
          }
          @for (step of steps(); track $index; let i = $index) {
            @if (i === c()) {
              @for (k of [ringKey()]; track k) {
                <circle
                  class="seam-ring"
                  [attr.cx]="xs()[i]"
                  [attr.cy]="cy()"
                  [attr.r]="radius() + radius() * 0.36"
                  fill="none"
                  [attr.stroke]="negative() ? '#C0392B' : '#F2B636'"
                  [attr.stroke-width]="radius() >= 20 ? 4 : 3.5"
                />
              }
            }
            <circle
              [attr.cx]="xs()[i]"
              [attr.cy]="cy()"
              [attr.r]="radius()"
              [attr.fill]="i < c() ? '#1F3A2B' : '#FFFDF7'"
              [attr.stroke]="i < c() ? '#1F3A2B' : '#C9C2AE'"
              stroke-width="3"
            />
            @for (h of holes(); track $index) {
              <circle [attr.cx]="xs()[i] + h[0]" [attr.cy]="cy() + h[1]" [attr.r]="holeR()" [attr.fill]="i < c() ? '#F2B636' : '#C9C2AE'" />
            }
            @if (i < c()) {
              <path
                [attr.d]="crossPath(xs()[i])"
                stroke="#F2B636"
                stroke-width="2"
                stroke-linecap="round"
              />
            }
          }
        }
      </svg>
      @for (step of steps(); track $index; let i = $index) {
        @if (navigable() && i < c()) {
          <button
            type="button"
            class="absolute top-0 rounded-full focus-visible:outline-2"
            [style.left.px]="xs()[i] - radius() - 6"
            [style.width.px]="radius() * 2 + 12"
            [style.height.px]="radius() * 2 + 12"
            [style.top.px]="cy() - radius() - 6"
            [attr.aria-label]="'Volver a ' + step"
            (click)="stepClick.emit(i)"
          ></button>
        }
        <span
          class="absolute -translate-x-1/2 text-center leading-tight"
          [class]="compactLabels() && i !== c() ? 'hidden sm:block' : ''"
          [style.left.px]="xs()[i]"
          [style.top.px]="svgHeight() + 6"
          [style.width.px]="labelWidth()"
          [style.font-size.px]="labelSize()"
          [style.font-weight]="i === c() ? 700 : 600"
          [style.color]="i <= c() ? '#1F3A2B' : '#6B6A5E'"
          [class.cursor-pointer]="navigable() && i < c()"
          (click)="navigable() && i < c() ? stepClick.emit(i) : null"
          >{{ step }}</span
        >
      }
    </div>
  `,
  styles: `
    .seam-reveal {
      transition-property: width;
      transition-timing-function: cubic-bezier(0.45, 0.1, 0.55, 0.9);
    }
    .seam-ring {
      transform-box: fill-box;
      transform-origin: center;
      animation: t-pop 450ms cubic-bezier(0.3, 1.4, 0.5, 1) 350ms both;
    }
    @media (prefers-reduced-motion: reduce) {
      .seam-reveal {
        transition-duration: 0ms !important;
      }
    }
  `,
})
export class Seam {
  readonly steps = input.required<readonly string[]>();
  readonly current = input.required<number>();
  readonly negative = input(false);
  readonly radius = input(22);
  /** Duración del cosido inicial (ms). */
  readonly enterMs = input(1700);
  /** Duración del cosido al avanzar un paso (ms). */
  readonly stepMs = input(600);
  readonly navigable = input(false);
  /** Todos los pasos hechos (al terminar un wizard). */
  readonly allDone = input(false);
  protected readonly c = computed(() => (this.allDone() ? this.steps().length : this.current()));
  /** En pantallas chicas muestra solo la etiqueta del paso actual. */
  readonly compactLabels = input(false);
  readonly stepClick = output<number>();

  protected readonly clipId = `t-seam-${nextId++}`;
  protected readonly width = signal(0);
  protected readonly revealed = signal(0);
  protected readonly revealMs = signal(0);
  protected readonly ringKey = signal(0);

  protected readonly pad = computed(() => Math.round(this.radius() * 1.5) + 4);
  protected readonly cy = computed(() => this.pad());
  protected readonly svgHeight = computed(() => this.pad() * 2);
  protected readonly labelSize = computed(() => (this.width() < 560 ? 13 : this.radius() >= 20 ? 16 : 15));
  protected readonly height = computed(() => this.svgHeight() + 6 + this.labelSize() * 2.6);
  protected readonly holeR = computed(() => (this.radius() >= 20 ? 3 : 2.5));
  protected readonly holes = computed(() => {
    const o = this.radius() >= 20 ? 6 : 5;
    return [
      [-o, -o],
      [o, -o],
      [-o, o],
      [o, o],
    ] as const;
  });
  protected readonly xs = computed(() => {
    const n = this.steps().length;
    const w = this.width();
    const pad = this.pad();
    if (n < 2) return [w / 2];
    return Array.from({ length: n }, (_, i) => pad + (i * (w - pad * 2)) / (n - 1));
  });
  protected readonly labelWidth = computed(() => {
    const xs = this.xs();
    return xs.length > 1 ? Math.max(64, xs[1] - xs[0] - 4) : 120;
  });
  protected readonly donePath = computed(() => {
    const xs = this.xs();
    return `M${xs[0]},${this.cy()} L${xs[Math.min(this.c(), xs.length - 1)]},${this.cy()}`;
  });

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    let first = true;

    afterNextRender(() => {
      this.width.set(el.getBoundingClientRect().width);
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver((entries) => {
          const w = entries[0]?.contentRect.width ?? 0;
          if (Math.abs(w - this.width()) > 0.5) this.width.set(w);
        });
        ro.observe(el);
        destroyRef.onDestroy(() => ro.disconnect());
      }
    });

    // Cose el tramo hecho: al entrar en enterMs y en cada cambio de paso en stepMs.
    effect(() => {
      const xs = this.xs();
      const current = Math.min(this.c(), xs.length - 1);
      if (!this.width()) return;
      const target = xs[current] - xs[0] + 24;
      untracked(() => {
        const wasFirst = first;
        first = false;
        if (wasFirst) {
          this.revealMs.set(0);
          this.revealed.set(0);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              this.revealMs.set(this.enterMs());
              this.revealed.set(target);
            }),
          );
        } else {
          this.revealMs.set(this.stepMs());
          this.revealed.set(target);
        }
      });
    });

    // Reinicia la animación del anillo cuando cambia el paso actual.
    effect(() => {
      this.current();
      untracked(() => this.ringKey.update((k) => k + 1));
    });
  }

  protected crossPath(x: number): string {
    const o = this.radius() >= 20 ? 6 : 5;
    const y = this.cy();
    return `M${x - o},${y - o} L${x + o},${y + o} M${x + o},${y - o} L${x - o},${y + o}`;
  }
}
