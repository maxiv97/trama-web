import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { BLOB_PATH, BLOB_TONES, BlobTone } from '../../icons/trama-icons';

/**
 * Ícono de Lucide apoyado sobre el blob de la marca (handoff §3).
 * Se usa en la navegación activa, en encabezados, estados vacíos y miniaturas.
 */
@Component({
  selector: 'app-blob-icon',
  imports: [LucideAngularModule],
  host: {
    class: 'relative inline-flex shrink-0 items-center justify-center',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  template: `
    <svg
      class="absolute inset-0 overflow-visible"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="-32 -32 64 64"
      aria-hidden="true"
    >
      <path [attr.d]="blobPath" [attr.fill]="fill()" [attr.transform]="'rotate(' + rotate() + ')'" />
    </svg>
    @if (icon(); as img) {
      <lucide-angular
        class="relative flex"
        [img]="img"
        [size]="iconSize() ?? defaultIconSize()"
        [strokeWidth]="strokeWidth()"
        [color]="iconColor()"
      />
    }
    <ng-content />
  `,
})
export class BlobIcon {
  readonly icon = input<LucideIconData | null>(null);
  readonly size = input(42);
  readonly iconSize = input<number | null>(null);
  readonly tone = input<BlobTone | string>('gold');
  readonly iconColor = input('#1F3A2B');
  readonly strokeWidth = input(2);
  readonly rotate = input(0);

  protected readonly blobPath = BLOB_PATH;
  protected readonly fill = computed(() => {
    const tone = this.tone();
    return (BLOB_TONES as Record<string, string>)[tone] ?? tone;
  });
  protected readonly defaultIconSize = computed(() => Math.round(this.size() * 0.48));
}
