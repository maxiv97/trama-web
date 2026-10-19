import { afterNextRender, Directive, ElementRef, inject, input } from '@angular/core';

const STAGGER_MS = 60;
const MAX_STEPS = 8;
const DURATION_MS = 450;
const EASE_OUT = 'cubic-bezier(.2,.8,.3,1)';

/**
 * Entrada de contenido (handoff §5): cada bloque sube 14 px y aparece en
 * 450 ms, 60 ms después del anterior (máximo 8 escalones). Usa la Web
 * Animations API y, con `prefers-reduced-motion`, queda en un fundido de 150 ms.
 *
 *   <header appEnter></header>
 *   <section [appEnter]="2"></section>
 */
@Directive({ selector: '[appEnter]' })
export class EnterDirective {
  /** Posición del bloque en la secuencia (0 = primero). */
  readonly appEnter = input<number | ''>(0);

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    afterNextRender(() => {
      if (typeof el.animate !== 'function') return;
      const raw = this.appEnter();
      const index = Math.min(typeof raw === 'number' ? raw : 0, MAX_STEPS - 1);
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: 'translateY(14px)' },
              { opacity: 1, transform: 'none' },
            ],
        {
          duration: reduced ? 150 : DURATION_MS,
          delay: reduced ? 0 : index * STAGGER_MS,
          easing: EASE_OUT,
          fill: 'backwards',
        },
      );
    });
  }
}
