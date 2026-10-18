import { Component, computed, input } from '@angular/core';

/**
 * Parche de verificación (handoff §4.6): círculo verde Trama con tilde.
 * En 72 y 32 px lleva un pespunte blanco interior que cierra parejo; en los
 * tamaños chicos queda solo el círculo y el tilde. "pending" lo muestra
 * hilvanado en gris mientras la verificación está en curso.
 */
@Component({
  selector: 'app-verified-badge',
  host: { class: 'inline-flex shrink-0', role: 'img', '[attr.aria-label]': 'label()' },
  template: `
    <svg viewBox="0 0 64 64" [attr.width]="size()" [attr.height]="size()" class="block">
      @if (pending()) {
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="#C9C2AE"
          stroke-width="3"
          stroke-linecap="round"
          pathLength="20"
          stroke-dasharray="0.45 0.55"
          transform="rotate(-86 32 32)"
        />
        <path
          d="M22.5 32.5l6.5 6.5 12.5-14"
          fill="none"
          stroke="#C9C2AE"
          stroke-width="4.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      } @else {
        <circle cx="32" cy="32" r="30" fill="#2E7D54" [attr.stroke]="ring() ? '#FFFDF7' : null" [attr.stroke-width]="ring() ? 6 : null" />
        @if (size() >= 72) {
          <circle
            cx="32"
            cy="32"
            r="23.5"
            fill="none"
            stroke="#FFFDF7"
            stroke-width="2.2"
            stroke-linecap="round"
            pathLength="20"
            stroke-dasharray="0.42 0.58"
            transform="rotate(-86 32 32)"
          />
          <path d="M22.5 32.5l6.5 6.5 12.5-14" fill="none" stroke="#FFFDF7" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
        } @else if (size() >= 28) {
          <circle
            cx="32"
            cy="32"
            r="23"
            fill="none"
            stroke="#FFFDF7"
            stroke-width="3.2"
            stroke-linecap="round"
            pathLength="12"
            stroke-dasharray="0.4 0.6"
            transform="rotate(-84 32 32)"
          />
          <path d="M22.5 32.5l6.5 6.5 12.5-14" fill="none" stroke="#FFFDF7" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
        } @else {
          <path d="M20 33l8 8 16-18" fill="none" stroke="#FFFDF7" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
        }
      }
    </svg>
  `,
})
export class VerifiedBadge {
  readonly size = input(18);
  readonly pending = input(false);
  /** Borde crema para apoyarlo sobre un avatar. */
  readonly ring = input(false);
  protected readonly label = computed(() => (this.pending() ? 'En verificación' : 'Verificado'));
}

/** Chip "Cedente verificada" / "Comercio verificado" (handoff §4.6). */
@Component({
  selector: 'app-verified-chip',
  imports: [VerifiedBadge],
  host: {
    class:
      'inline-flex items-center gap-1.5 rounded-full bg-trama-green-50 py-1 pl-1.5 pr-3 text-[13px] font-bold text-trama-green-700',
  },
  template: `<app-verified-badge [size]="18" /><span>{{ label() }}</span>`,
})
export class VerifiedChip {
  readonly label = input('Verificado');
}
