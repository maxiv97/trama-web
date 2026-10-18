import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * Puntada horizontal (handoff §1.4). Mide su propio ancho para que las
 * puntadas no se deformen y, si se pide, se "cose" de izquierda a derecha con
 * una máscara que crece en `scaleX`.
 *
 * - sewn:  hilo cosido, verde profundo 4,5 px, dash 12 9.
 * - knot:  subrayado naranja con nudo (círculo r 6) al final.
 * - baste: hilván claro 2,5 px, dash 8 7, para lo pendiente o vacío.
 * - faint: hilván más marcado (#C9C2AE), 3 px.
 * - thin:  pespunte fino de 2,5 px, dash 9 7 (encabezados de tabla, divisores).
 */
export type StitchVariant = 'sewn' | 'knot' | 'baste' | 'faint' | 'thin';

interface StitchStyle {
  color: string;
  width: number;
  dash: string;
}

const STYLES: Record<StitchVariant, StitchStyle> = {
  sewn: { color: '#1F3A2B', width: 4.5, dash: '12 9' },
  knot: { color: '#E07A3A', width: 4, dash: '12 9' },
  baste: { color: '#D6CFBB', width: 2.5, dash: '8 7' },
  faint: { color: '#C9C2AE', width: 3, dash: '10 8' },
  thin: { color: '#1F3A2B', width: 2.5, dash: '9 7' },
};

let nextId = 0;

@Component({
  selector: 'app-stitch',
  host: {
    class: 'block',
    '[style.width]': 'widthStyle()',
    '[style.height.px]': 'height()',
    'aria-hidden': 'true',
  },
  template: `
    <svg [attr.width]="measured()" [attr.height]="height()" class="block overflow-visible">
      @if (animate()) {
        <defs>
          <mask [attr.id]="maskId" maskUnits="userSpaceOnUse">
            <rect
              x="0"
              y="0"
              [attr.width]="measured()"
              [attr.height]="height()"
              fill="#fff"
              class="stitch-mask"
              [style.animation-delay.ms]="delay()"
              [style.animation-duration.ms]="duration()"
            />
          </mask>
        </defs>
      }
      <path
        [attr.d]="path()"
        [attr.stroke]="stroke()"
        [attr.stroke-width]="style().width"
        stroke-linecap="round"
        [attr.stroke-dasharray]="style().dash"
        fill="none"
        [attr.mask]="animate() ? 'url(#' + maskId + ')' : null"
      />
      @if (variant() === 'knot') {
        <circle
          [attr.cx]="measured() - 6"
          [attr.cy]="height() / 2"
          r="6"
          [attr.fill]="stroke()"
          [class.stitch-knot]="animate()"
          [style.animation-delay.ms]="delay() + duration() - 20"
        />
      }
    </svg>
  `,
  styles: `
    .stitch-mask {
      transform-box: fill-box;
      transform-origin: 0 0;
      animation: t-sew 900ms cubic-bezier(0.45, 0.1, 0.4, 1) both;
    }
    .stitch-knot {
      transform-box: fill-box;
      transform-origin: center;
      animation: t-pop 400ms cubic-bezier(0.3, 1.5, 0.5, 1) both;
    }
  `,
})
export class Stitch {
  readonly variant = input<StitchVariant>('sewn');
  /** Ancho en px; sin valor ocupa el 100 % del contenedor. */
  readonly width = input<number | null>(null);
  readonly color = input<string | null>(null);
  readonly animate = input(false);
  readonly delay = input(0);
  readonly duration = input(900);

  protected readonly maskId = `t-stitch-${nextId++}`;
  protected readonly style = computed(() => STYLES[this.variant()]);
  protected readonly stroke = computed(() => this.color() ?? this.style().color);
  protected readonly height = computed(() => (this.variant() === 'knot' ? 14 : 8));
  protected readonly widthStyle = computed(() => {
    const w = this.width();
    return w == null ? '100%' : `${w}px`;
  });

  private readonly hostWidth = signal(0);
  protected readonly measured = computed(() => this.width() ?? this.hostWidth());

  protected readonly path = computed(() => {
    const w = this.measured();
    const pad = Math.ceil(this.style().width / 2) + 1;
    const end = this.variant() === 'knot' ? w - 18 : w - pad;
    const y = this.height() / 2;
    return w > pad * 2 ? `M${pad},${y} L${Math.max(pad, end)},${y}` : '';
  });

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.hostWidth.set(el.getBoundingClientRect().width);
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver((entries) => {
        const w = entries[0]?.contentRect.width ?? 0;
        if (Math.abs(w - this.hostWidth()) > 0.5) this.hostWidth.set(w);
      });
      ro.observe(el);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }
}
