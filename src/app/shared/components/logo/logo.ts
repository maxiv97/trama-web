import { Component, input } from '@angular/core';

/*
 * Marca de Trama: "Hoja cosida". Blob amarillo del collage, hoja verde
 * profundo recortada y nervadura en costura recta con nudo.
 * Funciona igual sobre fondo claro y oscuro.
 */
@Component({
  selector: 'app-logo-icon',
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="-26 -26 52 52"
      fill="none"
      [attr.role]="decorative() ? null : 'img'"
      [attr.aria-label]="decorative() ? null : 'Trama'"
      [attr.aria-hidden]="decorative() || null"
    >
      <path
        d="M0,-22 C16,-24 26,-8 22,6 C18,20 4,26 -10,20 C-24,14 -26,-4 -18,-14 C-12,-20 -6,-22 0,-22Z"
        fill="#F2B636"
      />
      <g transform="rotate(14)">
        <path
          d="M0,-17 C9,-11 13,-2 9,8 C6,14 2,17 0,19 C-3,16 -9,11 -10,3 C-11,-6 -6,-13 0,-17Z"
          fill="#1F3A2B"
        />
        <path
          d="M0,-10 L0,14"
          stroke="#F6F0E2"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-dasharray="3.2 2.8"
        />
        <circle cx="0" cy="-12.5" r="2" fill="#F6F0E2" />
      </g>
    </svg>
  `,
})
export class LogoIcon {
  readonly size = input(28);
  /** Dentro de un link que ya tiene aria-label: el ícono no se lee dos veces. */
  readonly decorative = input(false);
}
