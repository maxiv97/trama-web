import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoIcon } from '../../../shared/components/logo/logo';

interface Step {
  n: string;
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
    title: 'El cedente carga su prenda',
    body: 'Subís fotos, descripción y el precio que querés recibir. La propuesta llega al comercio.',
  },
  {
    n: '2',
    title: 'El comercio revisa y acuerda',
    body: 'Acepta o envía una contraoferta. Cuando ambos coinciden, los precios quedan congelados.',
  },
  {
    n: '3',
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

const TRACK = ['Propuesta', 'Acordado', 'En stock', 'Vendido', 'Liquidado'];

@Component({
  selector: 'app-landing',
  imports: [RouterLink, LogoIcon],
  template: `
    <div class="min-h-screen bg-trama-sand-50 text-trama-dark">
      <!-- barra superior -->
      <header class="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 md:px-[7vw]">
        <a routerLink="/" class="flex items-center gap-2.5 font-display text-[22px] font-bold tracking-tight">
          <app-logo-icon [size]="30" />
          Trama
        </a>
        <a
          routerLink="/login"
          class="rounded-[9px] border border-trama-dark/20 px-[18px] py-2 text-sm font-semibold hover:bg-white"
          >Ingresar</a
        >
      </header>

      <!-- hero -->
      <section
        class="mx-auto grid max-w-[1240px] items-center gap-12 px-5 pt-6 pb-16 md:px-[7vw] lg:grid-cols-[1.05fr_.95fr] lg:gap-14"
      >
        <div>
          <span
            class="mb-5 inline-flex items-center gap-2 rounded-full bg-trama-green-50 px-3 py-1.5 text-[12.5px] font-semibold text-trama-green-700"
          >
            <span class="size-1.5 rounded-full bg-trama-brand"></span>
            Consignación de indumentaria, trazable
          </span>
          <h1
            class="mb-5 font-display text-[38px] leading-[1.06] font-semibold tracking-[-.025em] text-balance md:text-[52px]"
          >
            Gestioná tus consignaciones de indumentaria de forma simple y trazable
          </h1>
          <p class="mb-8 max-w-[520px] text-lg leading-relaxed text-trama-dark/70">
            Conectá tus prendas en desuso con comercios que las venden por vos. Vos ponés el precio
            que querés recibir, el comercio se encarga del resto y cada paso queda registrado: desde
            el acuerdo hasta la liquidación.
          </p>
          <div class="flex flex-wrap gap-3.5">
            <a routerLink="/register" [queryParams]="{ rol: 'cedente' }" [class]="primaryBtn"
              >Registrarme como cedente</a
            >
            <a routerLink="/register" [queryParams]="{ rol: 'comercio' }" [class]="secondaryBtn"
              >Registrarme como comercio</a
            >
          </div>
        </div>

        <!-- ilustración: tarjeta de un artículo consignado -->
        <div
          class="relative overflow-hidden rounded-[20px] border border-black/[.08] bg-[repeating-linear-gradient(135deg,#dceddf_0_14px,#d4e7d8_14px_28px)] p-6 sm:p-8"
          aria-hidden="true"
        >
          <div class="ml-auto w-full max-w-[340px] rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,.12)]">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-[11px] font-semibold tracking-wide text-trama-muted uppercase">Artículo</p>
                <p class="font-display text-lg font-semibold">Campera de lana · Talle M</p>
              </div>
              <span class="rounded-full bg-status-sold-soft px-2.5 py-1 text-xs font-semibold text-status-sold"
                >Vendido</span
              >
            </div>
            <div class="my-4 h-px bg-trama-sand-50"></div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <p class="text-[11px] font-semibold text-trama-muted">Precio cedente</p>
                <p class="font-display text-2xl font-bold tabular-nums">$15.000</p>
              </div>
              <div>
                <p class="text-[11px] font-semibold text-trama-muted">Precio de venta</p>
                <p class="font-display text-2xl font-bold text-trama-teal tabular-nums">$50.000</p>
              </div>
            </div>
            <ol class="mt-5 flex items-center">
              @for (s of track; track s; let i = $index, last = $last) {
                <li class="flex flex-1 flex-col items-center gap-1.5 last:flex-none">
                  <div class="flex w-full items-center">
                    <span
                      class="size-3 shrink-0 rounded-full"
                      [class]="i < 4 ? 'bg-trama-brand' : 'border-2 border-trama-brand bg-white'"
                    ></span>
                    @if (!last) {
                      <span class="h-0.5 flex-1" [class]="i < 3 ? 'bg-trama-brand' : 'bg-trama-sand-50'"></span>
                    }
                  </div>
                </li>
              }
            </ol>
            <div class="mt-1.5 flex justify-between text-[10.5px] font-medium text-trama-muted">
              @for (s of track; track s) {
                <span>{{ s }}</span>
              }
            </div>
          </div>
          <div
            class="mt-4 w-full max-w-[260px] rounded-2xl bg-trama-sidebar p-4 text-white shadow-[0_10px_30px_rgba(0,0,0,.18)]"
          >
            <p class="text-[11px] font-semibold text-white/60">Liquidación al cedente</p>
            <p class="font-display text-xl font-bold tabular-nums">$15.000</p>
            <p class="mt-1 text-xs text-white/60">Calculada automáticamente al registrar la venta</p>
          </div>
        </div>
      </section>

      <!-- cómo funciona -->
      <section class="border-t border-black/[.06] bg-white">
        <div class="mx-auto max-w-[1240px] px-5 py-16 md:px-[7vw]">
          <p class="mb-2.5 text-[13px] font-bold tracking-[.08em] text-trama-brand uppercase">
            ¿Cómo funciona?
          </p>
          <h2 class="mb-10 font-display text-[28px] font-semibold tracking-[-.02em] md:text-[34px]">
            Tres pasos, de la percha a la liquidación
          </h2>
          <div class="grid gap-6 md:grid-cols-3">
            @for (s of steps; track s.n) {
              <div class="rounded-2xl border border-black/[.05] bg-trama-sand-100 p-7">
                <div
                  class="mb-[18px] inline-flex size-10 items-center justify-center rounded-[10px] bg-trama-dark font-display text-lg font-bold text-white"
                >
                  {{ s.n }}
                </div>
                <h3 class="mb-2 font-display text-[19px] font-semibold">{{ s.title }}</h3>
                <p class="text-[14.5px] leading-normal text-trama-dark/70">{{ s.body }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- para quién -->
      <section class="mx-auto max-w-[1240px] px-5 py-16 md:px-[7vw]">
        <div class="grid gap-6 md:grid-cols-2">
          @for (a of audiences; track a.rol) {
            <div class="flex flex-col rounded-2xl border border-black/[.06] bg-white p-7 md:p-8">
              <p class="mb-2.5 text-[13px] font-bold tracking-[.08em] text-trama-brand uppercase">{{ a.tag }}</p>
              <h3 class="mb-5 font-display text-2xl leading-tight font-semibold tracking-[-.015em]">
                {{ a.title }}
              </h3>
              <ul class="mb-7 space-y-3">
                @for (p of a.points; track p) {
                  <li class="flex gap-3 text-[15px] leading-normal text-trama-dark/75">
                    <span class="mt-2 size-1.5 shrink-0 rounded-full bg-trama-gold"></span>
                    {{ p }}
                  </li>
                }
              </ul>
              <a
                routerLink="/register"
                [queryParams]="{ rol: a.rol }"
                class="mt-auto self-start"
                [class]="a.rol === 'cedente' ? primaryBtn : secondaryBtn"
                >{{ a.cta }}</a
              >
            </div>
          }
        </div>
      </section>

      <!-- llamado final -->
      <section class="bg-trama-brand text-white">
        <div
          class="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 px-5 py-14 md:flex-row md:items-center md:px-[7vw]"
        >
          <div>
            <h2 class="font-display text-[28px] font-semibold tracking-[-.02em]">¿Ya tenés cuenta?</h2>
            <p class="mt-1.5 text-white/80">Ingresá para seguir tus artículos y liquidaciones.</p>
          </div>
          <a
            routerLink="/login"
            class="rounded-[11px] bg-white px-[26px] py-3.5 text-[15.5px] font-semibold text-trama-brand hover:bg-trama-sand-100"
            >Ingresar</a
          >
        </div>
      </section>

      <!-- pie -->
      <footer class="bg-[#121711] text-[#ebefe4]/60">
        <div
          class="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-[13px] md:px-[7vw]"
        >
          <div class="flex items-center gap-2 font-display font-bold text-[#ebefe3]">
            <app-logo-icon [size]="22" /> Trama
          </div>
          <div>Práctica Profesionalizante 3 · Instituto Cervantes · 2026</div>
        </div>
      </footer>
    </div>
  `,
})
export class Landing {
  protected readonly steps = STEPS;
  protected readonly audiences = AUDIENCES;
  protected readonly track = TRACK;

  protected readonly primaryBtn =
    'inline-block rounded-[11px] bg-trama-brand px-[22px] py-3.5 text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(46,125,84,.28)] hover:bg-trama-green-700';
  protected readonly secondaryBtn =
    'inline-block rounded-[11px] border border-trama-dark/20 bg-white px-[22px] py-3.5 text-[15px] font-semibold text-trama-dark hover:bg-trama-sand-100';
}
