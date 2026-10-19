import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoIcon } from '../../../shared/components/logo/logo';
import { CollageHero } from './collage-hero';
import { BLOB_PATH } from '../../../shared/icons/trama-icons';
import { Stitch } from '../../../shared/components/stitch/stitch';

interface Step {
  n: string;
  hover: string;
  title: string;
  body: string;
}

interface Audience {
  tag: string;
  title: string;
  points: string[];
  cta: string;
  rol: 'cedente' | 'comercio';
}

const STEPS: Step[] = [
  {
    n: '1',
    hover: 'rotate(-12deg) scale(1.15)',
    title: 'El cedente carga su prenda',
    body: 'Subís fotos, descripción y el precio que querés recibir. La propuesta llega al comercio.',
  },
  {
    n: '2',
    hover: 'translateY(-6px) scale(1.15)',
    title: 'El comercio revisa y acuerda',
    body: 'Acepta o envía una contraoferta. Cuando ambos coinciden, los precios quedan congelados.',
  },
  {
    n: '3',
    hover: 'rotate(14deg) scale(1.15)',
    title: 'Se vende y se liquida',
    body: 'El comercio registra la venta y se calcula automáticamente tu liquidación.',
  },
];

const AUDIENCES: Audience[] = [
  {
    tag: 'Para cedentes',
    title: 'Tus prendas en desuso, a la venta sin que tengas que venderlas',
    points: [
      'Definís el precio que querés recibir por cada prenda.',
      'Seguís cada artículo: propuesta, acuerdo, recepción, venta y liquidación.',
      'Recibís notificaciones cuando algo cambia y consultás tus liquidaciones.',
    ],
    cta: 'Registrarme como cedente',
    rol: 'cedente',
  },
  {
    tag: 'Para comercios',
    title: 'Stock en consignación, ordenado y con cuentas claras',
    points: [
      'Revisás propuestas y aceptás o enviás contraofertas.',
      'Registrás la recepción física y las ventas en tus puntos de venta.',
      'Las liquidaciones a cada cedente se calculan solas, con reportes de rotación.',
    ],
    cta: 'Registrarme como comercio',
    rol: 'comercio',
  },
];

@Component({
  selector: 'app-landing',
  imports: [RouterLink, LogoIcon, CollageHero],
  template: `
    <div class="min-h-screen bg-trama-sand-50 text-trama-dark">
      <app-collage-hero />

      <!-- cómo funciona -->
      <section class="bg-trama-paper">
        <div class="mx-auto max-w-[1280px] px-5 py-16 sm:px-10 lg:px-20">
          <p class="text-eyebrow">¿Cómo funciona?</p>
          <h2 class="mt-2 font-display text-[30px] font-bold tracking-[-0.02em] md:text-[36px]">
            Tres pasos, de la percha a la liquidación
          </h2>
          <div class="mt-9 grid gap-6 md:grid-cols-3">
            @for (s of steps; track s.n; let i = $index) {
              <div
                class="step flex flex-col gap-3.5 rounded-[22px] bg-trama-sand-50 p-7"
                [style.--hover]="s.hover"
              >
                <span class="ico inline-flex h-[72px] w-[72px]" aria-hidden="true">
                  <svg viewBox="-32 -32 64 64" width="72" height="72">
                    @switch (i) {
                      @case (0) {
                        <path [attr.d]="blob" fill="#F2B636" />
                        <path
                          d="M-14,-16 L-6,-19 Q0,-14 6,-19 L14,-16 L20,-6 L13,-2 L13,18 Q0,21 -13,18 L-13,-2 L-20,-6 Z"
                          fill="#1F3A2B"
                          stroke="#1F3A2B"
                          stroke-width="3"
                          stroke-linejoin="round"
                        />
                      }
                      @case (1) {
                        <path [attr.d]="blob" fill="#E07A3A" />
                        <path
                          d="M-14,-2 L14,-2 L13,18 L-13,18 Z"
                          fill="#1F3A2B"
                          stroke="#1F3A2B"
                          stroke-width="3"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M-18,-14 L18,-14 L20,-4 Q15,1 10,-4 Q5,1 0,-4 Q-5,1 -10,-4 Q-15,1 -20,-4 Z"
                          fill="#F6F0E2"
                          stroke="#F6F0E2"
                          stroke-width="2"
                          stroke-linejoin="round"
                        />
                      }
                      @default {
                        <path [attr.d]="blob" fill="#A7B48F" />
                        <circle cx="-7" cy="6" r="12" fill="#F2B636" />
                        <path
                          d="M10,18 L10,-2 M10,4 C2,2 -2,-6 0,-14 C8,-10 10,-4 10,4 M10,0 C18,-2 22,-10 20,-18 C12,-14 10,-8 10,0"
                          fill="#1F3A2B"
                          stroke="#1F3A2B"
                          stroke-width="3"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      }
                    }
                  </svg>
                </span>
                <h3 class="font-display text-[21px] font-semibold">{{ s.title }}</h3>
                <p class="text-base leading-normal text-trama-body">{{ s.body }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- para quién -->
      <section class="mx-auto max-w-[1280px] px-5 py-16 sm:px-10 lg:px-20">
        <div class="grid gap-6 md:grid-cols-2">
          @for (a of audiences; track a.rol) {
            <div class="t-card flex flex-col p-7 md:p-9">
              <p class="text-eyebrow">{{ a.tag }}</p>
              <h3 class="text-title-2 mt-2 text-trama-dark">{{ a.title }}</h3>
              <ul class="mb-7 mt-5 space-y-3">
                @for (p of a.points; track p) {
                  <li class="flex gap-3 text-[15px] leading-normal text-trama-body">
                    <span class="mt-2 size-2 shrink-0 rounded-full bg-trama-knot"></span>
                    {{ p }}
                  </li>
                }
              </ul>
              <a
                routerLink="/register"
                [queryParams]="{ rol: a.rol }"
                class="t-btn t-btn-pill mt-auto self-start"
                [class]="a.rol === 'cedente' ? 't-btn-primary' : 't-btn-secondary'"
                >{{ a.cta }}</a
              >
            </div>
          }
        </div>
      </section>

      <!-- llamado final -->
      <section class="bg-trama-dark text-trama-sand-50">
        <div
          class="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-6 px-5 py-14 sm:px-10 md:flex-row md:items-center lg:px-20"
        >
          <div>
            <h2 class="font-display text-[30px] font-bold tracking-[-0.02em]">¿Ya tenés cuenta?</h2>
            <p class="mt-1.5 text-trama-sand-50/75">
              Ingresá para seguir tus artículos y liquidaciones.
            </p>
          </div>
          <a
            routerLink="/login"
            class="t-btn t-btn-pill bg-trama-gold !px-7 !py-3.5 text-trama-dark hover:brightness-105"
            >Ingresar</a
          >
        </div>
      </section>

      <!-- pie -->
      <footer class="border-t border-trama-sand-50/10 bg-trama-dark text-trama-sand-50/60">
        <div
          class="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-[13px] sm:px-10 lg:px-20"
        >
          <div class="flex items-center gap-2 font-display font-bold text-trama-sand-50">
            <app-logo-icon [size]="22" /> Trama
          </div>
          <div>Práctica Profesionalizante 3 · Instituto Cervantes · 2026</div>
        </div>
      </footer>
    </div>
  `,
  styles: `
    .ico {
      transition: transform 400ms cubic-bezier(0.3, 1.6, 0.5, 1);
    }
    .step:hover .ico {
      transform: var(--hover);
    }
  `,
})
export class Landing {
  protected readonly steps = STEPS;
  protected readonly audiences = AUDIENCES;
  protected readonly blob = BLOB_PATH;
  protected readonly sampleKpis = [
    { label: 'Ticket promedio', value: '$13.000' },
    { label: 'Vendidas', value: '37' },
    { label: 'En stock', value: '214' },
  ];
}
