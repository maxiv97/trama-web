import { afterNextRender, Component, ElementRef, inject, input, output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { Stitch } from '../stitch/stitch';

/**
 * Drawer de detalle (handoff §4.19). Entra desde la derecha con un ancho de
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
    <div class="t-overlay !items-stretch !justify-end !p-0" (click)="close.emit()">
      <aside
        #panel
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        tabindex="-1"
        class="drawer flex h-full flex-col bg-trama-paper outline-none"
        (click)="$event.stopPropagation()"
      >
        <header class="px-6 pb-4 pt-6">
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
        <footer class="flex items-center justify-end gap-3 border-t border-trama-sand-100 px-6 py-4 empty:hidden">
          <ng-content select="[footer]" />
        </footer>
      </aside>
    </div>
  `,
  styles: `
    .drawer {
      width: min(440px, 80%);
      border-radius: 22px 0 0 22px;
      box-shadow: var(--shadow-drawer);
      animation: t-drawer-in 300ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
    }
    @media (max-width: 640px) {
      .drawer {
        width: 92%;
      }
    }
  `,
})
export class Drawer {
  readonly title = input.required<string>();
  readonly eyebrow = input('');
  readonly lead = input('');
  readonly close = output<void>();
  protected readonly closeIcon = X;

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    afterNextRender(() => el.querySelector<HTMLElement>('aside')?.focus());
  }
}
