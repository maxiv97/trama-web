import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

export type BlobTone = 'gold' | 'cream' | 'sage' | 'peach' | 'success' | 'error' | 'warning';

const TONES: Record<BlobTone, string> = {
  gold: 'var(--color-trama-gold)',
  cream: 'var(--color-trama-sand-50)',
  sage: 'var(--color-trama-sage-soft)',
  peach: 'var(--color-trama-peach)',
  success: 'var(--color-trama-green-50)',
  error: 'var(--color-status-none-soft)',
  warning: 'var(--color-status-pending-soft)',
};

@Component({
  selector: 'app-blob-icon',
  imports: [LucideAngularModule],
  host: { 'aria-hidden': 'true' },
  template: `
    <svg class="blob" [attr.width]="size()" [attr.height]="size()" viewBox="-32 -32 64 64">
      <path
        [style.fill]="fill()"
        d="M0,-28 C18,-28 30,-14 28,4 C26,22 12,30 -4,28 C-20,26 -30,12 -28,-6 C-26,-22 -14,-28 0,-28Z"
      />
    </svg>
    @if (icon(); as glyph) {
      <lucide-angular class="glyph" [img]="glyph" [size]="glyphSize()" [strokeWidth]="2" />
    } @else if (letters()) {
      <span class="initials" [style.font-size.px]="initialsSize()">{{ letters() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      flex-shrink: 0;
      place-items: center;
      color: var(--color-trama-dark);
    }

    // Centrar el icono o iniciales
    .blob,
    .glyph,
    .initials {
      grid-area: 1 / 1;
    }

    .initials {
      font-family: var(--font-display);
      font-weight: 800;
      line-height: 1;
    }

    .glyph {
      display: flex;
    }
  `,
})
export class BlobIcon {
  readonly icon = input<LucideIconData>();
  readonly initials = input<string>();
  // 34 px en encabezados y 72 px a 104 px en ilustraciones y estados vacíos
  readonly size = input(34);
  readonly tone = input<BlobTone>('gold');

  protected readonly fill = computed(() => TONES[this.tone()]);
  protected readonly letters = computed(() =>
    (this.initials() ?? '').trim().slice(0, 2).toUpperCase(),
  );
  // Iniciales: 22 px en blob de 64 px
  protected readonly initialsSize = computed(() => Math.round(this.size() * 0.34));
  // Tamaño del icono sobre el blob
  // Encabezados: 18 px sobre 34 px
  // Ilustraciones: 36 px sobre 72 px o 52 px sobre 104 px
  protected readonly glyphSize = computed(() =>
    Math.round(this.size() * (this.size() <= 40 ? 0.53 : 0.5)),
  );
}
