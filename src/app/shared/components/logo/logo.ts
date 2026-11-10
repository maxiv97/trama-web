import { Component, input } from '@angular/core';

@Component({
  selector: 'app-logo-icon',
  host: { 'aria-hidden': 'true', class: 'inline-flex shrink-0' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="-26 -26 52 52"
      fill="none"
      focusable="false"
    >
      <path
        class="fill-trama-gold"
        d="M0,-22 C16,-24 26,-8 22,6 C18,20 4,26 -10,20 C-24,14 -26,-4 -18,-14 C-12,-20 -6,-22 0,-22Z"
      />
      <g transform="rotate(14)">
        <path
          class="fill-trama-dark"
          d="M0,-17 C9,-11 13,-2 9,8 C6,14 2,17 0,19 C-3,16 -9,11 -10,3 C-11,-6 -6,-13 0,-17Z"
        />
        <path
          class="stroke-trama-sand-50"
          d="M0,-10 L0,14"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-dasharray="3.2 2.8"
        />
        <circle class="fill-trama-sand-50" cx="0" cy="-12.5" r="2" />
      </g>
    </svg>
  `,
})
export class LogoIcon {
  readonly size = input(26);
}
