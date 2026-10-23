import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoIcon } from '../../../shared/components/logo/logo';

/*
 * Hero "Collage" de la landing (handoff §2.2). Un árbol cuyas hojas son
 * prendas: la isla entra, crece el tronco, aparece la copa amarilla, se dibujan
 * las ramas y brotan las prendas; tres caen al local del pie del árbol, sale
 * una moneda "$" de vuelta al árbol, nace un brote y vuelven a brotar prendas.
 * Después la escena se acomoda a la derecha, entra el texto y aparecen los
 * decorativos del fondo. Con prefers-reduced-motion todo queda en un fundido.
 *
 * Paleta sin azules: el pizarra del prototipo se reemplaza por verde profundo,
 * terracota y salvia.
 */

const G: Record<string, string> = {
  tshirt:
    'M-14,-16 L-6,-19 Q0,-14 6,-19 L14,-16 L20,-6 L13,-2 L13,18 Q0,21 -13,18 L-13,-2 L-20,-6 Z',
  dress: 'M-6,-19 Q0,-15 6,-19 L8,-8 Q16,8 18,19 Q0,23 -18,19 Q-16,8 -8,-8 Z',
  pants: 'M-12,-19 L12,-19 L15,19 L5,19 L0,-3 L-5,19 L-15,19 Z',
  sweater: 'M-12,-17 Q0,-12 12,-17 L22,4 L16,8 L12,0 L12,18 L-12,18 L-12,0 L-16,8 L-22,4 Z',
  skirt: 'M-10,-14 L10,-14 L19,16 Q0,21 -19,16 Z',
  sock: 'M-6,-19 L6,-19 L6,4 L16,10 Q19,18 10,19 L-4,19 Q-8,17 -6,10 Z',
};

const ICON: Record<string, { d: string; fill: boolean }> = {
  squiggle: { d: 'M-30,0 q7.5,-12 15,0 t15,0 t15,0 t15,0', fill: false },
  blob: {
    d: 'M0,-22 C16,-24 26,-8 22,6 C18,20 4,26 -10,20 C-24,14 -26,-4 -18,-14 C-12,-20 -6,-22 0,-22Z',
    fill: true,
  },
  dot: { d: 'M0,-7 C5,-7 7,-3 7,0 C7,5 3,7 0,7 C-5,7 -7,3 -7,0 C-7,-4 -4,-7 0,-7Z', fill: true },
};

// [tipo, x, y, color, escala, giro]
const DECOR: [string, number, number, string, number, number][] = [
  ['blob', 640, 120, '#F2B636', 1.8, 0],
  ['squiggle', 470, 96, '#B4553A', 0.8, 0],
  ['dot', 90, 112, '#E07A3A', 1.4, 0],
  ['dot', 620, 560, '#F2B636', 2, 0],
  ['blob', 1200, 410, '#A7B48F', 1.4, 0],
  ['squiggle', 1120, 46, '#F2B636', 0.7, -10],
  ['dot', 60, 660, '#F2B636', 2.4, 0],
  ['dot', 1250, 600, '#7D9268', 1.2, 0],
  ['squiggle', 590, 365, '#E07A3A', 0.75, 15],
  ['squiggle', 1200, 150, '#B4553A', 0.6, -70],
  ['squiggle', 450, 636, '#B4553A', 0.6, 0],
];

const TRUNK = 'M-12,0 C-8,-70 -14,-140 -7,-205 C-4,-220 4,-220 7,-205 C14,-140 8,-70 12,0 Z';
const BRANCHES: [string, number][] = [
  ['M0,-190 C-20,-230 -60,-250 -100,-285', 7],
  ['M2,-198 C14,-240 46,-268 92,-296', 7],
  ['M0,-205 C-2,-250 2,-290 -4,-330', 6],
  ['M-4,-160 C-36,-180 -86,-196 -128,-236', 5],
  ['M6,-166 C42,-186 96,-204 136,-242', 5],
];
// [x, y, prenda, giro]
const LEAVES: [number, number, string, number][] = [
  [-140, -385, 'tshirt', -8],
  [-45, -455, 'dress', 6],
  [65, -455, 'sweater', -6],
  [155, -380, 'tshirt', 10],
  [-175, -270, 'skirt', -12],
  [-80, -335, 'pants', 10],
  [35, -350, 'sock', 16],
  [130, -280, 'skirt', -4],
  [-115, -180, 'pants', 6],
  [95, -180, 'dress', -8],
];
const FALL = [6, 8, 9];
const FRESH = ['sweater', 'tshirt', 'dress'];
const GARM = ['#1F3A2B', '#E07A3A', '#B4553A', '#F6F0E2'];
const FRESHC = ['#E07A3A', '#1F3A2B', '#B4553A'];
const SHOP: [number, number] = [210, -30];

interface Leaf {
  x: number;
  y: number;
  d: string;
  color: string;
  rot: number;
  pop: number;
  sway: number;
  swayDelay: number;
  fall: { dx: number; dy: number; delay: number } | null;
}

@Component({
  selector: 'app-collage-hero',
  imports: [RouterLink, LogoIcon],
  host: { class: 'block' },
  template: `
    <section class="hero relative overflow-hidden bg-trama-sand-50">
      <div
        class="relative mx-auto flex max-w-[1280px] flex-col lg:block lg:aspect-[1280/720] lg:max-h-[760px]"
      >
        <!-- Escena (escritorio: ocupa todo el bloque) -->
        <div
          class="scene-wrap pointer-events-none relative order-2 mt-2 lg:absolute lg:inset-0 lg:mt-0"
          aria-hidden="true"
        >
          <svg
            class="scene-svg block h-auto w-full lg:h-full"
            [attr.viewBox]="viewBox()"
            preserveAspectRatio="xMidYMid meet"
          >
            <!-- decorativos del fondo, solo después de la intro -->
            @for (d of decor; track $index; let i = $index) {
              <g
                [attr.transform]="
                  'translate(' + d[1] + ',' + d[2] + ') rotate(' + d[5] + ') scale(' + d[4] + ')'
                "
              >
                <g class="fb pop" [style.--t]="4.7 + i * 0.06 + 's'" [style.--d]="0.55 + 's'">
                  <g
                    class="fb float"
                    [style.--t]="5.4 + i * 0.1 + 's'"
                    [style.--d]="3 + (i % 4) * 0.6 + 's'"
                  >
                    @if (icons[d[0]].fill) {
                      <path
                        [attr.d]="icons[d[0]].d"
                        [attr.fill]="d[3]"
                        [attr.stroke]="d[3]"
                        stroke-width="3"
                        stroke-linejoin="round"
                      />
                    } @else {
                      <path
                        [attr.d]="icons[d[0]].d"
                        fill="none"
                        [attr.stroke]="d[3]"
                        stroke-width="7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    }
                  </g>
                </g>
              </g>
            }

            <g class="slide">
              <g transform="translate(920,640)">
                <!-- isla -->
                <path
                  class="fb blob"
                  style="--t: 0.1s; --d: 0.7s"
                  fill="#7D9268"
                  d="M-250,28 C-250,-2 -120,-16 40,-16 C200,-16 330,-4 330,28 C330,58 200,66 40,66 C-120,66 -250,58 -250,28Z"
                />
                <!-- copa: círculo amarillo detrás del tronco -->
                <path
                  class="fb blob"
                  style="--t: 0.7s; --d: 0.8s"
                  fill="#F2B636"
                  d="M10,-520 C150,-525 240,-425 232,-300 C225,-170 130,-82 0,-85 C-135,-88 -232,-180 -228,-310 C-224,-430 -125,-516 10,-520Z"
                />
                <!-- tronco y ramas -->
                <path
                  class="fbb grow"
                  style="--t: 0.3s; --d: 0.8s"
                  fill="#1F3A2B"
                  [attr.d]="trunk"
                />
                @for (b of branches; track $index; let i = $index) {
                  <path
                    class="draw"
                    [style.--t]="0.8 + i * 0.06 + 's'"
                    style="--d: 0.6s"
                    fill="none"
                    stroke="#1F3A2B"
                    [attr.stroke-width]="b[1]"
                    stroke-linecap="round"
                    stroke-dasharray="320"
                    [attr.d]="b[0]"
                  />
                }

                <!-- local -->
                <g [attr.transform]="'translate(' + shop[0] + ',' + shop[1] + ') scale(1.2)'">
                  <g class="fb pop" style="--t: 1.9s; --d: 0.5s">
                    <g class="fbb bounce" style="--t: 3s; --d: 0.55s">
                      <path
                        d="M-30,-4 L30,-4 L28,34 L-28,34 Z"
                        fill="#1F3A2B"
                        stroke="#1F3A2B"
                        stroke-width="4"
                        stroke-linejoin="round"
                      />
                      <path d="M-7,12 L7,12 L7,34 L-7,34 Z" fill="#F2B636" />
                      <path
                        d="M-38,-22 L38,-22 L42,-4 Q31,6 21,-4 Q10.5,6 0,-4 Q-10.5,6 -21,-4 Q-31,6 -42,-4 Z"
                        fill="#E07A3A"
                        stroke="#E07A3A"
                        stroke-width="3"
                        stroke-linejoin="round"
                      />
                    </g>
                  </g>
                </g>

                <!-- prendas que hacen de hojas -->
                @for (l of leaves; track $index) {
                  <g [attr.transform]="'translate(' + l.x + ',' + l.y + ')'">
                    <g class="fb pop" [style.--t]="l.pop + 's'" style="--d: 0.5s">
                      <g
                        class="fb"
                        [class.sway]="!l.fall"
                        [style.--t]="l.swayDelay + 's'"
                        [style.--d]="l.sway + 's'"
                      >
                        <g
                          class="fb"
                          [class.fall]="!!l.fall"
                          [style.--dx]="l.fall ? l.fall.dx + 'px' : null"
                          [style.--dy]="l.fall ? l.fall.dy + 'px' : null"
                          [style.--t]="l.fall ? l.fall.delay + 's' : null"
                        >
                          <path
                            [attr.d]="l.d"
                            [attr.transform]="'rotate(' + l.rot + ') scale(1.3)'"
                            [attr.fill]="l.color"
                            [attr.stroke]="l.color"
                            stroke-width="3"
                            stroke-linejoin="round"
                          />
                        </g>
                      </g>
                    </g>
                  </g>
                }

                <!-- moneda que vuelve al árbol -->
                <g [attr.transform]="'translate(' + shop[0] + ',' + (shop[1] - 30) + ')'">
                  <g class="fb coin" style="--t: 3.05s; --d: 0.9s">
                    <circle r="16" fill="#F2B636" stroke="#1F3A2B" stroke-width="2.5" />
                    <text
                      y="6"
                      text-anchor="middle"
                      font-family="Bricolage Grotesque, sans-serif"
                      font-weight="800"
                      font-size="18"
                      fill="#1F3A2B"
                    >
                      $
                    </text>
                  </g>
                </g>

                <!-- brote -->
                <g [attr.transform]="'translate(' + (shop[0] - 110) + ',40) scale(1.3)'">
                  <g class="fbb pop" style="--t: 3.85s; --d: 0.6s">
                    <path
                      d="M0,0 L0,-20 M0,-10 C-10,-12 -16,-20 -14,-30 C-4,-26 0,-20 0,-10 M0,-14 C10,-16 16,-24 14,-34 C4,-30 0,-24 0,-14"
                      fill="#1F3A2B"
                      stroke="#1F3A2B"
                      stroke-width="4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                </g>

                <!-- prendas nuevas donde estaban las que cayeron -->
                @for (f of fresh; track $index; let k = $index) {
                  <g [attr.transform]="'translate(' + f.x + ',' + f.y + ')'">
                    <g class="fb pop" [style.--t]="3.95 + k * 0.13 + 's'" style="--d: 0.6s">
                      <g class="fb sway" style="--t: 4.9s" [style.--d]="2.6 + k * 0.4 + 's'">
                        <path
                          [attr.d]="f.d"
                          [attr.transform]="'rotate(' + f.rot + ') scale(1.3)'"
                          [attr.fill]="f.color"
                          [attr.stroke]="f.color"
                          stroke-width="3"
                          stroke-linejoin="round"
                        />
                      </g>
                    </g>
                  </g>
                }
              </g>
            </g>
          </svg>
        </div>

        <!-- Nav: entrada "Hilo que cruza" (logo, palabra, hilo e Ingresar) -->
        <header
          class="absolute inset-x-0 top-0 z-10 flex items-center gap-4 px-5 py-5 sm:px-10 lg:px-20 lg:py-[26px]"
        >
          <a routerLink="/" class="flex shrink-0 items-center gap-2.5" aria-label="Trama, inicio">
            <span class="nav-logo inline-flex">
              <app-logo-icon [size]="34" [decorative]="true" />
            </span>
            <span class="inline-flex overflow-hidden">
              <span
                class="nav-word inline-block font-display text-[22px] font-bold tracking-[-0.02em] text-trama-dark"
                >Trama</span
              >
            </span>
          </a>

          <span class="nav-thread pointer-events-none h-2.5 min-w-0 flex-1" aria-hidden="true">
            <svg
              class="block h-full w-full overflow-visible"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="nav-thread-mask" maskUnits="userSpaceOnUse" x="-2" y="-5" width="104" height="20">
                  <path
                    class="nav-thread-draw"
                    d="M0,5 C20,0 30,10 50,5 S80,0 100,5"
                    fill="none"
                    stroke="#fff"
                    stroke-width="6"
                    pathLength="100"
                  />
                </mask>
              </defs>
              <path
                d="M0,5 C20,0 30,10 50,5 S80,0 100,5"
                fill="none"
                stroke="#F2B636"
                stroke-width="2"
                stroke-linecap="round"
                stroke-dasharray="3 2.5"
                vector-effect="non-scaling-stroke"
                mask="url(#nav-thread-mask)"
              />
            </svg>
          </span>

          <a
            routerLink="/login"
            class="nav-cta shrink-0 rounded-full border-[1.5px] border-trama-dark bg-trama-sand-50 px-5 py-2.5 text-[15px] font-semibold text-trama-dark transition-colors hover:bg-trama-paper"
          >
            Ingresar
          </a>
        </header>

        <!-- Texto -->
        <div
          class="text relative z-[5] order-1 flex flex-col items-start gap-[22px] px-5 pb-4 pt-24 sm:px-10 lg:absolute lg:left-20 lg:top-[22%] lg:w-[min(520px,42%)] lg:p-0"
        >
          <span
            class="txt rounded-full bg-trama-gold px-3.5 py-[7px] text-sm font-bold text-trama-dark"
            style="--i: 0"
          >
            Consignación de indumentaria, trazable
          </span>
          <h1
            class="txt text-balance font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] text-trama-dark sm:text-[46px] xl:text-[54px]"
            style="--i: 1"
          >
            Gestioná tus consignaciones de indumentaria de forma simple y trazable
          </h1>
          <p class="txt text-pretty text-lg leading-[1.55] text-trama-body" style="--i: 2">
            Conectá tus prendas en desuso con comercios que las venden por vos. Vos ponés el precio
            que querés recibir, el comercio se encarga del resto y cada paso queda registrado: desde
            el acuerdo hasta la liquidación.
          </p>
          <a
            routerLink="/register"
            class="txt cta rounded-full bg-trama-dark px-7 py-[15px] text-base font-bold text-trama-sand-50"
            style="--i: 3"
          >
            Registrarse
          </a>
        </div>
      </div>
    </section>
  `,
  styles: `
    .fb {
      transform-box: fill-box;
      transform-origin: center;
    }
    .fbb {
      transform-box: fill-box;
      transform-origin: 50% 100%;
    }
    .pop {
      animation: c-pop var(--d, 0.5s) cubic-bezier(0.3, 1.3, 0.5, 1) var(--t, 0s) both;
    }
    .blob {
      animation: c-blob var(--d, 0.7s) cubic-bezier(0.3, 1.3, 0.5, 1) var(--t, 0s) both;
    }
    .grow {
      animation: c-grow var(--d, 0.8s) cubic-bezier(0.2, 0.8, 0.3, 1) var(--t, 0s) both;
    }
    .draw {
      stroke-dashoffset: 320;
      animation: c-draw var(--d, 0.6s) ease-out var(--t, 0s) both;
    }
    .bounce {
      animation: c-bounce var(--d, 0.55s) ease var(--t, 0s) both;
    }
    .fall {
      animation: c-fall 0.85s cubic-bezier(0.5, 0, 0.7, 1) var(--t, 0s) both;
    }
    .coin {
      animation: c-coin var(--d, 0.9s) ease-in-out var(--t, 0s) both;
    }
    .sway {
      animation: c-sway var(--d, 2.4s) ease-in-out var(--t, 0s) infinite alternate;
    }
    .float {
      animation: c-float var(--d, 3s) ease-in-out var(--t, 0s) infinite alternate;
    }
    @media (min-width: 1024px) {
      .slide {
        transform-origin: 70% 80%;
        animation: c-slide 0.85s cubic-bezier(0.6, 0, 0.2, 1) 3.9s both;
      }
    }
    /* El texto entra recién cuando la escena terminó de armarse, en todos los tamaños. */
    .txt {
      animation: c-text 650ms cubic-bezier(0.2, 0.8, 0.3, 1) calc(4.3s + var(--i) * 110ms) both;
    }
    .cta {
      transition: transform 250ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
    .cta:hover {
      transform: translateY(-2px) rotate(-1.5deg);
    }
    @keyframes c-blob {
      from {
        transform: scale(0);
        opacity: 0;
      }
      70% {
        transform: scale(1.05);
        opacity: 1;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    @keyframes c-grow {
      from {
        transform: scaleY(0);
      }
      to {
        transform: scaleY(1);
      }
    }
    @keyframes c-draw {
      to {
        stroke-dashoffset: 0;
      }
    }
    @keyframes c-pop {
      0% {
        transform: scale(0) rotate(-30deg);
        opacity: 0;
      }
      70% {
        transform: scale(1.15) rotate(6deg);
        opacity: 1;
      }
      100% {
        transform: scale(1) rotate(0);
        opacity: 1;
      }
    }
    @keyframes c-fall {
      0% {
        transform: none;
        opacity: 1;
      }
      35% {
        transform: translate(calc(var(--dx) * 0.25), calc(var(--dy) * 0.45)) rotate(60deg);
        opacity: 1;
      }
      100% {
        transform: translate(var(--dx), var(--dy)) rotate(150deg) scale(0.3);
        opacity: 0;
      }
    }
    @keyframes c-sway {
      from {
        transform: rotate(-5deg);
      }
      to {
        transform: rotate(5deg);
      }
    }
    @keyframes c-bounce {
      0%,
      100% {
        transform: none;
      }
      40% {
        transform: translateY(-12px) scaleY(1.06);
      }
      70% {
        transform: translateY(2px) scaleY(0.95);
      }
    }
    @keyframes c-float {
      0%,
      100% {
        transform: translateY(0) rotate(0);
      }
      50% {
        transform: translateY(-9px) rotate(6deg);
      }
    }
    @keyframes c-coin {
      0% {
        transform: translate(0, 0) scale(0);
        opacity: 0;
      }
      15% {
        transform: translate(0, -30px) scale(1);
        opacity: 1;
      }
      55% {
        transform: translate(-40px, -90px) scale(1.1);
        opacity: 1;
      }
      100% {
        transform: translate(-80px, 40px) scale(0.4);
        opacity: 0;
      }
    }
    @keyframes c-slide {
      from {
        transform: translateX(-340px) scale(1.08);
      }
      to {
        transform: none;
      }
    }
    @keyframes c-text {
      from {
        opacity: 0;
        transform: translateY(18px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
    /* Entrada del nav (corre en todos los tamaños, antes que la escena) */
    .nav-logo {
      transform-origin: center;
      animation: c-pop 0.5s cubic-bezier(0.3, 1.3, 0.5, 1) 0s both;
    }
    .nav-word {
      animation: c-word 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) 0.25s both;
    }
    .nav-cta {
      animation: c-pop 0.5s cubic-bezier(0.3, 1.3, 0.5, 1) 0.75s both;
    }
    .nav-thread-draw {
      stroke-dasharray: 100;
      stroke-dashoffset: 100;
      animation: c-thread-draw 1.3s ease-in-out 0.1s both;
    }
    .nav-thread {
      animation: c-thread-fade 1.3s ease-in-out 0.1s both;
    }
    @keyframes c-word {
      from {
        transform: translateX(-110%);
        opacity: 0;
      }
      to {
        transform: none;
        opacity: 1;
      }
    }
    @keyframes c-thread-draw {
      0% {
        stroke-dashoffset: 100;
      }
      55%,
      100% {
        stroke-dashoffset: 0;
      }
    }
    @keyframes c-thread-fade {
      0%,
      55% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .nav-logo,
      .nav-word,
      .nav-cta,
      .txt {
        animation: c-text 400ms ease both;
      }
      .nav-thread {
        display: none;
      }
      .sway,
      .float {
        animation: none;
      }
      .fall,
      .coin {
        display: none;
      }
    }
  `,
})
export class CollageHero {
  protected readonly icons = ICON;
  protected readonly decor = DECOR;
  protected readonly trunk = TRUNK;
  protected readonly branches = BRANCHES;
  protected readonly shop = SHOP;

  protected readonly leaves: Leaf[] = LEAVES.map(([x, y, type, rot], i) => {
    const fi = FALL.indexOf(i);
    return {
      x,
      y,
      rot,
      d: G[type],
      color: GARM[i % GARM.length],
      pop: 1.35 + i * 0.07,
      sway: 2.4 + (i % 3) * 0.5,
      swayDelay: 4.8 + i * 0.05,
      fall: fi >= 0 ? { dx: SHOP[0] - x, dy: SHOP[1] - 10 - y, delay: 2.3 + fi * 0.18 } : null,
    };
  });

  protected readonly fresh = FALL.map((li, k) => {
    const [x, y, , rot] = LEAVES[li];
    return { x, y, rot: -rot, d: G[FRESH[k]], color: FRESHC[k] };
  });

  protected viewBox(): string {
    return typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches
      ? '0 0 1280 720'
      : '560 40 720 700';
  }
}
