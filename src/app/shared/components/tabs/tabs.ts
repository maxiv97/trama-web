import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  input,
  model,
  signal,
  viewChildren,
} from '@angular/core';

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Pestañas (handoff §4.14): texto de 15 px, la activa en 700 verde profundo y
 * el resto en 500 gris. El indicador es una puntada con nudo bajo la pestaña
 * activa que se desliza con translateX (300 ms, ease-out).
 */
@Component({
  selector: 'app-tabs',
  host: { class: 'block' },
  template: `
    <!-- Celular: grilla de 2 columnas, sin scroll -->
    <div role="tablist" class="grid grid-cols-2 gap-2 sm:hidden">
      @for (t of options(); track t.value) {
        <button
          type="button"
          role="tab"
          class="t-chip w-full justify-center !whitespace-normal !px-3 !py-2.5 text-center leading-tight"
          [attr.aria-selected]="t.value === value()"
          [class.t-chip-active]="t.value === value()"
          (click)="value.set(t.value)"
        >
          {{ t.label }}
        </button>
      }
    </div>

    <!-- Escritorio: pestañas con la puntada con nudo que se desliza -->
    <div class="relative hidden sm:block">
      <div role="tablist" class="relative flex flex-wrap gap-x-7 gap-y-2 pb-5">
        @for (t of options(); track t.value) {
          <button
            #tab
            type="button"
            role="tab"
            class="whitespace-nowrap py-1 text-[15px] transition-colors duration-150"
            [class]="t.value === value() ? 'font-bold text-trama-dark' : 'font-medium text-trama-muted hover:text-trama-dark'"
            [attr.aria-selected]="t.value === value()"
            [attr.tabindex]="t.value === value() ? 0 : -1"
            (click)="value.set(t.value)"
            (keydown)="onKey($event)"
          >
            {{ t.label }}
          </button>
        }
        <span
          class="indicator pointer-events-none absolute left-0 top-0 h-[14px]"
          [style.width.px]="ind().w"
          [style.transform]="'translate(' + ind().x + 'px,' + ind().y + 'px)'"
          aria-hidden="true"
        >
          <svg class="block h-full w-full overflow-visible">
            <line
              x1="2"
              y1="7"
              [attr.x2]="ind().w - 16"
              y2="7"
              stroke="#E07A3A"
              stroke-width="3.5"
              stroke-linecap="round"
              stroke-dasharray="10 7"
            />
            <circle [attr.cx]="ind().w - 5" cy="7" r="5" fill="#E07A3A" />
          </svg>
        </span>
      </div>
      <div class="h-px bg-trama-sand-100"></div>
    </div>
  `,
  styles: `
    .indicator {
      transition:
        transform 300ms cubic-bezier(0.2, 0.8, 0.3, 1),
        width 300ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
  `,
})
export class Tabs<T extends string = string> {
  readonly options = input.required<readonly TabOption<T>[]>();
  readonly value = model.required<T>();

  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');
  protected readonly ind = signal({ x: 0, y: 0, w: 0 });

  private readonly activeIndex = computed(() =>
    this.options().findIndex((o) => o.value === this.value()),
  );

  constructor() {
    afterRenderEffect(() => {
      const el = this.tabs()[this.activeIndex()]?.nativeElement;
      if (!el) return;
      // La puntada va justo debajo de la pestaña activa (también si las pestañas pasan a otra línea).
      const next = { x: el.offsetLeft, y: el.offsetTop + el.offsetHeight + 1, w: Math.max(40, el.offsetWidth) };
      const cur = this.ind();
      if (cur.x !== next.x || cur.y !== next.y || cur.w !== next.w) this.ind.set(next);
    });
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.options().length;
    let i = this.activeIndex();
    if (e.key === 'ArrowRight') i = (i + 1) % n;
    else if (e.key === 'ArrowLeft') i = (i - 1 + n) % n;
    else return;
    e.preventDefault();
    this.value.set(this.options()[i].value);
    this.tabs()[i]?.nativeElement.focus();
  }
}

/**
 * Segmentado (handoff §4.14): contenedor crema con padding 4 y radio 13; el
 * indicador verde profundo de radio 10 se desliza y el texto activo pasa a crema.
 */
@Component({
  selector: 'app-segmented',
  host: { class: 'inline-block max-w-full' },
  template: `
    <div role="radiogroup" [attr.aria-label]="ariaLabel()" class="seg relative flex overflow-x-auto rounded-[13px] p-1" [class.seg-page]="onPage()">
      <span
        class="seg-ind absolute bottom-1 top-1 rounded-[10px] bg-trama-dark"
        [style.left.px]="0"
        [style.width.px]="ind().w"
        [style.transform]="'translateX(' + ind().x + 'px)'"
        aria-hidden="true"
      ></span>
      @for (o of options(); track o.value) {
        <button
          #seg
          type="button"
          role="radio"
          class="relative z-[1] whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm font-semibold transition-colors duration-150"
          [class]="o.value === value() ? 'text-trama-sand-50' : 'text-trama-body hover:text-trama-dark'"
          [attr.aria-checked]="o.value === value()"
          (click)="value.set(o.value)"
        >
          {{ o.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .seg {
      background: var(--color-trama-sand-50);
    }
    .seg-page {
      background: var(--color-trama-paper);
      box-shadow: inset 0 0 0 1px var(--color-trama-sand-100);
    }
    .seg-ind {
      transition:
        transform 300ms cubic-bezier(0.2, 0.8, 0.3, 1),
        width 300ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
  `,
})
export class Segmented<T extends string = string> {
  readonly options = input.required<readonly TabOption<T>[]>();
  readonly value = model.required<T>();
  readonly ariaLabel = input('');
  readonly onPage = input(false);

  private readonly segs = viewChildren<ElementRef<HTMLButtonElement>>('seg');
  protected readonly ind = signal({ x: 0, w: 0 });

  constructor() {
    afterRenderEffect(() => {
      const i = this.options().findIndex((o) => o.value === this.value());
      const el = this.segs()[i]?.nativeElement;
      if (!el) return;
      const next = { x: el.offsetLeft, w: el.offsetWidth };
      const cur = this.ind();
      if (cur.x !== next.x || cur.w !== next.w) this.ind.set(next);
    });
  }
}
