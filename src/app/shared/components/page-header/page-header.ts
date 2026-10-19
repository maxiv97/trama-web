import { Component, computed, inject, input } from '@angular/core';
import { LucideIconData } from 'lucide-angular';
import { AuthService } from '../../../core/auth/auth.service';
import { EnterDirective } from '../../directives/enter.directive';
import { BlobIcon } from '../blob-icon/blob-icon';
import { Stitch } from '../stitch/stitch';

const ROLE_EYEBROW = { consignor: 'Cedente', merchant: 'Comercio' } as const;

/**
 * Encabezado de página (handoff §4.1): ícono de la sección sobre un blob
 * amarillo con el eyebrow del rol, título en title-1, subrayado con nudo
 * (solo en el panel y en las pantallas de resultado) y la bajada con el estado
 * resumido. Las acciones se proyectan a la derecha con [actions].
 */
@Component({
  selector: 'app-page-header',
  imports: [BlobIcon, Stitch, EnterDirective],
  host: { class: 'block' },
  styles: `
    @media (max-width: 767.98px) {
      .actions > ::ng-deep * {
        flex: 1 1 auto;
      }
    }
  `,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div class="min-w-0 basis-full md:flex-1 md:basis-0">
        <div class="flex items-center gap-2.5" [appEnter]="0">
          @if (icon(); as img) {
            <app-blob-icon [icon]="img" [size]="34" [iconSize]="18" tone="gold" />
          }
          <span class="text-eyebrow">{{ eyebrowText() }}</span>
        </div>
        <h1 class="text-title-1 mt-3 text-balance text-trama-dark" [appEnter]="1">{{ title() }}</h1>
        @if (knot()) {
          <app-stitch class="mt-3" variant="knot" [width]="200" [animate]="true" [delay]="350" />
        }
        @if (lead()) {
          <p class="text-lead mt-3 max-w-[70ch] text-trama-body" [appEnter]="2">{{ lead() }}</p>
        }
        <ng-content select="[lead]" />
      </div>
      <div class="actions flex w-full flex-wrap items-center gap-3 empty:hidden md:w-auto" [appEnter]="2">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
})
export class PageHeader {
  private readonly auth = inject(AuthService);

  readonly title = input.required<string>();
  readonly icon = input<LucideIconData | null>(null);
  /** Sección que acompaña al rol en el eyebrow ("Comercio · Inventario"). */
  readonly section = input<string>('');
  /** Reemplaza al eyebrow completo. */
  readonly eyebrow = input<string>('');
  readonly lead = input<string>('');
  readonly knot = input(false);

  protected readonly eyebrowText = computed(() => {
    if (this.eyebrow()) return this.eyebrow();
    const role = this.auth.role();
    const base = role ? ROLE_EYEBROW[role] : '';
    return [base, this.section()].filter(Boolean).join(' · ');
  });
}
