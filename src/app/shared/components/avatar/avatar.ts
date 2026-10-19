import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, Store } from 'lucide-angular';
import { hashIndex } from '../../icons/trama-icons';
import { VerifiedBadge } from '../verified-badge/verified-badge';

const CONSIGNOR_BG = ['#F2B636', '#F9D9C4', '#E9EEDD', '#DCEDDF'] as const;

/**
 * Avatar (handoff §4.6): el del cedente es redondo, con las iniciales en
 * Bricolage 800 sobre un fondo de color; el del comercio es un cuadrado
 * redondeado verde profundo con el ícono Store en amarillo.
 */
@Component({
  selector: 'app-avatar',
  imports: [LucideAngularModule, VerifiedBadge],
  host: {
    class: 'relative inline-flex shrink-0',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  template: `
    @if (kind() === 'merchant') {
      <span
        class="flex h-full w-full items-center justify-center bg-trama-dark"
        [style.border-radius.px]="merchantRadius()"
      >
        <lucide-angular [img]="storeIcon" [size]="iconSize()" color="#F2B636" [strokeWidth]="2" />
      </span>
    } @else {
      <span
        class="flex h-full w-full items-center justify-center rounded-full font-display font-extrabold text-trama-dark"
        [style.background]="background()"
        [style.font-size.px]="fontSize()"
        >{{ initials() }}</span
      >
    }
    @if (verified() !== null && size() >= 36) {
      <app-verified-badge
        class="absolute -bottom-1 -right-1"
        [size]="badgeSize()"
        [ring]="true"
        [pending]="verified() === false"
      />
    }
  `,
})
export class Avatar {
  readonly name = input('');
  readonly kind = input<'consignor' | 'merchant'>('consignor');
  readonly size = input(38);
  /** true: verificado, false: en verificación, null: no se muestra el parche. */
  readonly verified = input<boolean | null>(null);

  protected readonly storeIcon = Store;

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  });
  protected readonly background = computed(
    () => CONSIGNOR_BG[hashIndex(this.name(), CONSIGNOR_BG.length)],
  );
  protected readonly fontSize = computed(() => Math.max(10, Math.round(this.size() * 0.36)));
  protected readonly iconSize = computed(() => Math.round(this.size() * 0.5));
  protected readonly merchantRadius = computed(() => Math.round(this.size() * 0.28));
  protected readonly badgeSize = computed(() => (this.size() >= 56 ? 26 : 18));
}
