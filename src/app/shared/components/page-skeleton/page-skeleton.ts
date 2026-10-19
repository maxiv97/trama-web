import { Component, computed, input } from '@angular/core';

export type SkeletonLayout = 'dashboard' | 'table' | 'detail' | 'form' | 'list';

/**
 * Esqueleto hilvanado (handoff §5): mientras carga se ve la estructura de la
 * pantalla con bloques de borde punteado que pulsan de opacidad. Tiene la misma
 * forma que el contenido final para que la pantalla no salte.
 */
@Component({
  selector: 'app-page-skeleton',
  host: { class: 'block', role: 'status', 'aria-label': 'Cargando', 'aria-busy': 'true' },
  template: `
    <div class="space-y-6">
      <div class="space-y-3">
        <div class="flex items-center gap-2.5">
          <div class="t-skeleton h-[34px] w-[34px] !rounded-full"></div>
          <div class="t-skeleton h-3.5 w-28 !rounded-full"></div>
        </div>
        <div class="t-skeleton h-10 w-72 max-w-full !rounded-xl"></div>
        <div class="t-skeleton h-4 w-[28rem] max-w-full !rounded-full"></div>
      </div>

      @switch (layout()) {
        @case ('dashboard') {
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            @for (i of four; track i) {
              <div class="t-skeleton h-[104px]"></div>
            }
          </div>
          <div class="grid gap-5 lg:grid-cols-2">
            <div class="t-skeleton h-64"></div>
            <div class="t-skeleton h-64"></div>
          </div>
        }
        @case ('table') {
          <div class="t-card space-y-4 p-6">
            <div class="flex flex-wrap gap-2">
              @for (i of four; track i) {
                <div class="t-skeleton h-9 w-28 !rounded-full"></div>
              }
            </div>
            @for (i of rowList(); track i) {
              <div class="flex items-center gap-4">
                <div class="t-skeleton h-12 w-12 shrink-0 !rounded-full"></div>
                <div class="t-skeleton h-4 flex-1 !rounded-full"></div>
                <div class="t-skeleton hidden h-4 w-32 !rounded-full sm:block"></div>
                <div class="t-skeleton h-6 w-24 !rounded-full"></div>
              </div>
            }
          </div>
        }
        @case ('detail') {
          <div class="t-skeleton h-28"></div>
          <div class="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div class="t-skeleton h-80"></div>
            <div class="t-skeleton h-80"></div>
          </div>
        }
        @case ('form') {
          <div class="t-card space-y-5 p-6 sm:p-8">
            @for (i of rowList(); track i) {
              <div class="space-y-2">
                <div class="t-skeleton h-3.5 w-32 !rounded-full"></div>
                <div class="t-skeleton h-12 !rounded-[11px]"></div>
              </div>
            }
          </div>
        }
        @default {
          <div class="space-y-3">
            @for (i of rowList(); track i) {
              <div class="t-skeleton h-[76px]"></div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class PageSkeleton {
  readonly layout = input<SkeletonLayout>('list');
  readonly rows = input(5);
  protected readonly four = [0, 1, 2, 3];
  protected readonly rowList = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
}
