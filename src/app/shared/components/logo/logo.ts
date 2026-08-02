import { Component, input } from '@angular/core';

@Component({
  selector: 'app-logo-icon',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 200 200" fill="none">
      <g transform="translate(18 12) scale(5.125)">
        <path
          d="M16 3.5 C 24.5 9, 25.5 18.5, 16 28.5 C 6.5 18.5, 7.5 9, 16 3.5 Z"
          fill="#2E7D54"
        ></path>
        <path
          d="M16 8 L16 24.5"
          stroke="#E3A92B"
          stroke-width="2"
          stroke-linecap="round"
          stroke-dasharray="0.2 3.3"
        ></path>
        <path
          d="M15.4 14 L10.8 11.4 M16.6 18 L21.2 15.4"
          stroke="#E3A92B"
          stroke-width="1.5"
          stroke-linecap="round"
        ></path>
      </g>
    </svg>
  `,
})
export class LogoIcon {
  readonly size = input(28);
}
