import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

let nextId = 0;

const DARK = '#1F3A2B';
const GOLD = '#F2B636';
const SAND = '#C9C2AE';
const PAPER = '#FFFDF7';
const RED = '#C0392B';

/** Geometría del botón de costura para un radio dado (misma que `Seam`, a escala). */
interface ButtonGeometry {
  r: number;
  ring: number;
  ringWidth: number;
  stroke: number;
  hole: number;
  holeR: number;
  cross: number;
}

const MINI: ButtonGeometry = { r: 8, ring: 8 * 1.36, ringWidth: 2.5, stroke: 2, hole: 3.2, holeR: 1.5, cross: 1.4 };
const VERTICAL: ButtonGeometry = { r: 15, ring: 15 * 1.36, ringWidth: 4, stroke: 3, hole: 5, holeR: 2.5, cross: 2 };

const MINI_PAD = 14;
const MINI_CY = 16;
const V_X = 26;
const V_TOP = 26;
const V_GAP = 50;

/**
 * Recorrido de la prenda en contenedores angostos (handoff "Recorrido mobile", opción 1b):
 * resumen del paso actual, una costura mini de botones r 8 que entra entera y un link que
 * despliega el recorrido completo en vertical (opción 1a). La usa `app-progress-tracker`
 * cuando la costura grande no entra.
 */
@Component({
  selector: 'app-seam-summary',
  host: { class: 'flex flex-col gap-3.5' },
  template: `
    <div class="flex items-baseline justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="text-[13px] font-semibold text-trama-body">Paso {{ current() + 1 }} de {{ steps().length }}</span>
        <span class="font-display text-[22px] font-extrabold leading-tight text-trama-dark">{{ steps()[current()] }}</span>
      </div>
      @if (next(); as nextStep) {
        <span class="shrink-0 text-[13px] text-trama-muted">Sigue: {{ nextStep }}</span>
      }
    </div>

    <div class="mini block">
      <svg [attr.width]="width()" height="32" class="block overflow-visible" aria-hidden="true">
        @if (width() > 0) {
          @if (current() < steps().length - 1) {
            <path
              [attr.d]="'M' + xs()[current()] + ',' + cy + ' L' + xs()[steps().length - 1] + ',' + cy"
              [attr.stroke]="sand"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-dasharray="6 5"
            />
          }
          @if (current() > 0) {
            <defs>
              <clipPath [attr.id]="clipId">
                <rect
                  [attr.x]="xs()[0] - 10"
                  [attr.y]="cy - 10"
                  height="20"
                  class="seam-reveal"
                  [style.width.px]="revealed()"
                  [style.transition-duration.ms]="revealMs()"
                />
              </clipPath>
            </defs>
            <path
              [attr.d]="'M' + xs()[0] + ',' + cy + ' L' + xs()[current()] + ',' + cy"
              [attr.stroke]="dark"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray="6 5"
              [attr.clip-path]="'url(#' + clipId + ')'"
            />
          }
          @for (step of steps(); track $index; let i = $index) {
            @if (i === current()) {
              @for (k of [ringKey()]; track k) {
                <circle
                  class="seam-ring"
                  [attr.cx]="xs()[i]"
                  [attr.cy]="cy"
                  [attr.r]="mini.ring"
                  fill="none"
                  [attr.stroke]="ringColor()"
                  [attr.stroke-width]="mini.ringWidth"
                />
              }
            }
            <circle
              [attr.cx]="xs()[i]"
              [attr.cy]="cy"
              [attr.r]="mini.r"
              [attr.fill]="i < current() ? dark : paper"
              [attr.stroke]="i < current() ? dark : sand"
              [attr.stroke-width]="mini.stroke"
            />
            @for (h of holes(mini); track $index) {
              <circle [attr.cx]="xs()[i] + h[0]" [attr.cy]="cy + h[1]" [attr.r]="mini.holeR" [attr.fill]="i < current() ? gold : sand" />
            }
            @if (i < current()) {
              <path [attr.d]="cross(xs()[i], cy, mini)" [attr.stroke]="gold" [attr.stroke-width]="mini.cross" stroke-linecap="round" />
            }
          }
        }
      </svg>
    </div>

    @if (expanded()) {
      <div [id]="listId" class="full border-t border-trama-sand-200 pt-2">
        <div class="relative" [style.height.px]="verticalHeight()">
          <svg width="52" [attr.height]="verticalHeight()" class="absolute left-0 top-0 block overflow-visible" aria-hidden="true">
            @for (step of steps(); track $index; let i = $index) {
              @if (i < steps().length - 1) {
                <path
                  [attr.d]="'M' + vx + ',' + vy(i) + ' L' + vx + ',' + vy(i + 1)"
                  [attr.stroke]="i < current() ? dark : sand"
                  [attr.stroke-width]="i < current() ? 5 : 4"
                  stroke-linecap="round"
                  stroke-dasharray="12 10"
                />
              }
            }
            @for (step of steps(); track $index; let i = $index) {
              @if (i === current()) {
                <circle [attr.cx]="vx" [attr.cy]="vy(i)" [attr.r]="vertical.ring" fill="none" [attr.stroke]="ringColor()" [attr.stroke-width]="vertical.ringWidth" />
              }
              <circle
                [attr.cx]="vx"
                [attr.cy]="vy(i)"
                [attr.r]="vertical.r"
                [attr.fill]="i < current() ? dark : paper"
                [attr.stroke]="i < current() ? dark : sand"
                [attr.stroke-width]="vertical.stroke"
              />
              @for (h of holes(vertical); track $index) {
                <circle [attr.cx]="vx + h[0]" [attr.cy]="vy(i) + h[1]" [attr.r]="vertical.holeR" [attr.fill]="i < current() ? gold : sand" />
              }
              @if (i < current()) {
                <path [attr.d]="cross(vx, vy(i), vertical)" [attr.stroke]="gold" [attr.stroke-width]="vertical.cross" stroke-linecap="round" />
              }
            }
          </svg>
          <ol class="relative pt-px">
            @for (step of steps(); track $index; let i = $index) {
              <li
                class="flex h-[50px] items-center justify-between gap-3 pl-16 text-[15px]"
                [class.font-bold]="i === current()"
                [class.font-medium]="i !== current()"
                [class.text-trama-dark]="i <= current()"
                [class.text-trama-muted]="i > current()"
                [attr.aria-current]="i === current() ? 'step' : null"
              >
                <span>
                  {{ step }}
                  <span class="sr-only">{{ i < current() ? '(hecho)' : i > current() ? '(pendiente)' : '' }}</span>
                </span>
                @if (i === current()) {
                  <span class="text-[13px] font-bold text-status-pending">Ahora</span>
                }
              </li>
            }
          </ol>
        </div>
      </div>
    }

    <button
      type="button"
      class="min-h-11 self-start px-1 text-[14px] font-bold text-trama-dark underline decoration-trama-knot underline-offset-4 focus-visible:outline-2"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="listId"
      (click)="expanded.set(!expanded())"
    >
      {{ expanded() ? 'Ocultar recorrido' : 'Ver recorrido completo' }}
    </button>
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
    .full {
      animation: s-fade 150ms ease-out both;
    }
    @keyframes s-fade {
      from {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .seam-reveal {
        transition-duration: 0ms !important;
      }
      .seam-ring,
      .full {
        animation: none;
      }
    }
  `,
})
export class SeamSummary {
  readonly steps = input.required<readonly string[]>();
  readonly current = input.required<number>();
  /** Resultado negativo: anillo rojo. */
  readonly negative = input(false);
  /** Estado terminal: no hay un paso siguiente esperado. */
  readonly terminal = input(false);
  /** Duración del cosido inicial (ms). */
  readonly enterMs = input(1700);
  /** Duración del cosido al avanzar un paso (ms). */
  readonly stepMs = input(600);

  protected readonly dark = DARK;
  protected readonly gold = GOLD;
  protected readonly sand = SAND;
  protected readonly paper = PAPER;
  protected readonly mini = MINI;
  protected readonly vertical = VERTICAL;
  protected readonly cy = MINI_CY;
  protected readonly vx = V_X;

  private readonly id = nextId++;
  protected readonly clipId = `t-seam-mini-${this.id}`;
  protected readonly listId = `t-seam-full-${this.id}`;

  readonly expanded = signal(false);
  protected readonly width = signal(0);
  protected readonly revealed = signal(0);
  protected readonly revealMs = signal(0);
  protected readonly ringKey = signal(0);

  protected readonly next = computed(() => {
    const i = this.current();
    if (this.negative() || this.terminal() || i >= this.steps().length - 1) return null;
    return this.steps()[i + 1];
  });
  protected readonly ringColor = computed(() => (this.negative() ? RED : GOLD));
  protected readonly xs = computed(() => {
    const n = this.steps().length;
    const w = this.width();
    if (n < 2) return [w / 2];
    return Array.from({ length: n }, (_, i) => MINI_PAD + (i * (w - MINI_PAD * 2)) / (n - 1));
  });
  protected readonly verticalHeight = computed(() => V_TOP * 2 + V_GAP * (this.steps().length - 1));

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    let first = true;

    afterNextRender(() => {
      const mini = el.querySelector('.mini') as HTMLElement;
      this.width.set(mini.getBoundingClientRect().width);
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver((entries) => {
          const w = entries[0]?.contentRect.width ?? 0;
          if (Math.abs(w - this.width()) > 0.5) this.width.set(w);
        });
        ro.observe(mini);
        destroyRef.onDestroy(() => ro.disconnect());
      }
    });

    // Cose el tramo hecho igual que la costura grande: al entrar y en cada cambio de paso.
    effect(() => {
      const xs = this.xs();
      const current = Math.min(this.current(), xs.length - 1);
      if (!this.width()) return;
      const target = xs[current] - xs[0] + 20;
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

    effect(() => {
      this.current();
      untracked(() => this.ringKey.update((k) => k + 1));
    });
  }

  protected vy(i: number): number {
    return V_TOP + i * V_GAP;
  }

  protected holes(g: ButtonGeometry): readonly (readonly [number, number])[] {
    const o = g.hole;
    return [
      [-o, -o],
      [o, -o],
      [-o, o],
      [o, o],
    ];
  }

  protected cross(x: number, y: number, g: ButtonGeometry): string {
    const o = g.hole;
    return `M${x - o},${y - o} L${x + o},${y + o} M${x + o},${y - o} L${x - o},${y + o}`;
  }
}
