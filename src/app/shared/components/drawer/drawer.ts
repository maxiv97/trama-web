import { afterNextRender, Component, DestroyRef, ElementRef, inject, input, output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { Stitch } from '../stitch/stitch';

/**
 * Drawer de detalle (handoff §4.19). Con side="auto" pasa a ser una hoja
 * inferior en el celular, para filtros y menús agrupados. Entra desde la derecha con un ancho de
 * min(440px, 80%), radio 22 0 0 22, sombra de drawer y un overlay verde
 * translúcido, así el contenido sigue a la vista detrás. Encabezado con
 * eyebrow, título en title-2, bajada y botón × de 36 px; debajo, un pespunte.
 * El pie se proyecta con [footer].
 */
@Component({
  selector: 'app-drawer',
  imports: [LucideAngularModule, Stitch],
  host: { '(document:keydown.escape)': 'close.emit()' },
  template: `
    <div class="t-overlay ov !p-0" [class.ov-auto]="side() === 'auto'" (click)="close.emit()">
      <aside
        #panel
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        tabindex="-1"
        class="drawer flex flex-col bg-trama-paper outline-none"
        [class.drawer-auto]="side() === 'auto'"
        (click)="$event.stopPropagation()"
      >
        @if (side() === 'auto') {
          <span class="grab mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-trama-thread-light sm:hidden" aria-hidden="true"></span>
        }
        <header class="px-6 pb-4 pt-6" [class.sheet-head]="side() === 'auto'">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              @if (eyebrow()) {
                <p class="text-eyebrow">{{ eyebrow() }}</p>
              }
              <h2 class="text-title-2 mt-1.5 text-trama-dark">{{ title() }}</h2>
              @if (lead()) {
                <p class="mt-1 text-[15px] text-trama-body">{{ lead() }}</p>
              }
            </div>
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-trama-body transition-colors hover:bg-trama-sand-50 hover:text-trama-dark"
              aria-label="Cerrar"
              (click)="close.emit()"
            >
              <lucide-angular [img]="closeIcon" [size]="20" />
            </button>
          </div>
          <app-stitch class="mt-4" variant="thin" />
        </header>
        <div class="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6">
          <ng-content />
        </div>
        <footer class="foot flex items-center justify-end gap-3 border-t border-trama-sand-100 px-6 py-4 empty:hidden">
          <ng-content select="[footer]" />
        </footer>
      </aside>
    </div>
  `,
  styles: `
    .ov {
      align-items: stretch !important;
      justify-content: flex-end !important;
    }
    .drawer {
      height: 100%;
      width: min(440px, 80%);
      border-radius: 22px 0 0 22px;
      box-shadow: var(--shadow-drawer);
      animation: t-drawer-in 300ms cubic-bezier(0.2, 0.8, 0.3, 1) backwards;
    }
    @media (max-width: 639.98px) {
      .drawer {
        width: 92%;
      }
      /* En el celular, side="auto" es una hoja que sube desde abajo */
      .ov-auto {
        align-items: flex-end !important;
        justify-content: stretch !important;
      }
      .drawer-auto {
        width: 100%;
        height: auto;
        max-height: 88dvh;
        border-radius: 22px 22px 0 0;
        box-shadow: 0 -16px 40px rgba(31, 58, 43, 0.18);
        animation: sheet-in 300ms cubic-bezier(0.2, 0.8, 0.3, 1) backwards;
      }
      .sheet-head {
        padding-top: 14px;
      }
      .drawer-auto .foot {
        padding-bottom: calc(16px + env(safe-area-inset-bottom));
      }
    }
    @keyframes sheet-in {
      from {
        transform: translateY(100%);
      }
      to {
        transform: none;
      }
    }
  `,
})
export class Drawer {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly lead = input('');
  /** right: siempre lateral. auto: lateral en escritorio y hoja inferior en el celular. */
  readonly side = input<'right' | 'auto'>('right');
  readonly close = output<void>();
  protected readonly closeIcon = X;

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    // Se monta en el body para quedar por encima de todo (barra inferior incluida),
    // sin importar las animaciones o los contextos de apilado de quien lo usa.
    inject(DestroyRef).onDestroy(() => el.remove());
    afterNextRender(() => {
      document.body.appendChild(el);
      el.querySelector<HTMLElement>('aside')?.focus();
    });
  }
}
