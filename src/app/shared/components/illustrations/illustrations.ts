import { Component, input } from '@angular/core';

/** Tilde verde que se dibuja sobre un blob de éxito (handoff §4.10). Sin nudo. */
@Component({
  selector: 'app-success-art',
  host: { class: 'inline-flex', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 120 120" [attr.width]="size()" [attr.height]="size()" class="block overflow-visible">
      <path
        class="art-pop"
        d="M60,6 C94,6 116,32 112,66 C108,98 84,116 54,112 C24,108 4,84 8,52 C12,22 30,6 60,6Z"
        fill="#DCEDDF"
      />
      <path
        class="art-draw"
        d="M34,62 L52,80 L88,40"
        fill="none"
        stroke="#2E7D54"
        stroke-width="7"
        stroke-linecap="round"
        stroke-linejoin="round"
        pathLength="1"
        stroke-dasharray="1 1"
        stroke-dashoffset="1"
      />
    </svg>
  `,
  styles: `
    .art-pop {
      transform-box: fill-box;
      transform-origin: center;
      animation: t-pop 500ms cubic-bezier(0.3, 1.4, 0.5, 1) 100ms both;
    }
    .art-draw {
      animation: t-draw 550ms cubic-bezier(0.4, 0, 0.2, 1) 550ms both;
    }
  `,
})
export class SuccessArt {
  readonly size = input(116);
}

/** Hilo cortado con la cruz roja que rebota, sobre un blob de error (handoff §4.10). */
@Component({
  selector: 'app-cut-thread-art',
  host: { class: 'inline-flex', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 160 120" [attr.width]="size()" [attr.height]="size() * 0.75" class="block overflow-visible">
      <path d="M80,10 C112,10 132,34 128,66 C124,96 100,112 72,108 C44,104 26,82 30,52 C34,24 52,10 80,10Z" fill="#F7DEDB" />
      <path d="M6,64 C26,44 46,44 62,60" fill="none" stroke="#1F3A2B" stroke-width="5" stroke-linecap="round" stroke-dasharray="11 8" />
      <path d="M98,60 C114,76 134,80 154,62" fill="none" stroke="#1F3A2B" stroke-width="5" stroke-linecap="round" stroke-dasharray="11 8" />
      <path d="M62,60 C66,64 68,70 66,76" fill="none" stroke="#1F3A2B" stroke-width="5" stroke-linecap="round" />
      <path d="M98,60 C94,56 90,54 92,48" fill="none" stroke="#1F3A2B" stroke-width="5" stroke-linecap="round" />
      <g class="art-pop" stroke="#C0392B" stroke-width="5" stroke-linecap="round">
        <path d="M72,48 l16,16 M88,48 l-16,16" />
      </g>
    </svg>
  `,
  styles: `
    .art-pop {
      transform-box: fill-box;
      transform-origin: center;
      animation: t-pop 400ms cubic-bezier(0.3, 1.6, 0.5, 1) 300ms both;
    }
  `,
})
export class CutThreadArt {
  readonly size = input(160);
}

/** Aguja que cose: reemplaza al spinner circular (handoff §4.10). */
@Component({
  selector: 'app-needle',
  host: { class: 'inline-flex', role: 'status', 'aria-label': 'Cargando' },
  template: `
    <svg viewBox="0 0 300 50" [attr.width]="width()" class="block h-auto overflow-visible">
      <path class="run" d="M6,34 L294,34" stroke="#C9C2AE" stroke-width="3" stroke-linecap="round" stroke-dasharray="12 9" stroke-dashoffset="-10.5" />
      <path class="run" d="M6,34 L294,34" stroke="#1F3A2B" stroke-width="5" stroke-linecap="round" stroke-dasharray="12 9" />
      <g transform="translate(160,0)">
        <g class="needle">
          <path d="M14,4 L0,34" stroke="#1F3A2B" stroke-width="4" stroke-linecap="round" />
          <ellipse cx="11.6" cy="9.5" rx="1.4" ry="3.2" transform="rotate(25 11.6 9.5)" fill="#FFFDF7" />
        </g>
      </g>
    </svg>
  `,
  styles: `
    .run {
      animation: needle-run 1s linear infinite;
    }
    .needle {
      animation: needle-bob 0.5s ease-in-out infinite;
    }
    @keyframes needle-run {
      from {
        stroke-dashoffset: 0;
      }
      to {
        stroke-dashoffset: -21;
      }
    }
    @keyframes needle-bob {
      0%,
      100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(5px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .run,
      .needle {
        animation: none;
      }
    }
  `,
})
export class Needle {
  readonly width = input(220);
}
