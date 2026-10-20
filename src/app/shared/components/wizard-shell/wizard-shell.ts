import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ChevronLeft, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { Seam } from '../seam/seam';

export interface WizardStep {
  /** Etiqueta corta bajo el botón de costura ("Fotos"). */
  label: string;
  /** Título del paso: una pregunta o una tarea ("¿A qué comercio la enviás?"). */
  title: string;
  lead?: string;
}

export interface WizardSummaryRow {
  label: string;
  /** null = pendiente. */
  value: string | null;
}

/**
 * Wizard de Trama (handoff §6). Estructura compartida por "Cargar prenda" y
 * "Registro":
 *
 * - Encabezado con eyebrow "… · Paso N de M", el título del paso (una pregunta
 *   o una tarea) y la bajada.
 * - Recorrido cosido (app-seam, r 18): los pasos hechos se pueden tocar para
 *   volver; los futuros no.
 * - Cuerpo en grilla 1fr 300px: el paso a la izquierda y el resumen a la
 *   derecha. En el celular el resumen aparece recién en el último paso.
 * - Barra fija al pie: Anterior (fantasma), el estado de guardado y Siguiente
 *   (primario). En el último paso, `finishLabel`.
 * - Transición: el contenido entra 24 px desde el lado hacia el que se avanza.
 * - Al terminar (`done`), la pantalla de resultado proyectada con [result]
 *   reemplaza al cuerpo y todos los pasos se ven hechos.
 */
@Component({
  selector: 'app-wizard-shell',
  imports: [LucideAngularModule, Seam],
  host: { class: 'block' },
  template: `
    <div class="wizard mx-auto max-w-[1080px] overflow-hidden bg-trama-paper sm:rounded-[26px]">
      <!-- Encabezado -->
      <header class="px-5 pb-2 pt-5 sm:px-10 sm:pt-8">
        <!-- Celular: volver, eyebrow y puntada de progreso -->
        <div class="sm:hidden">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-trama-dark hover:bg-trama-sand-50 disabled:opacity-0"
              [disabled]="current() === 0 || done()"
              aria-label="Paso anterior"
              (click)="back.emit()"
            >
              <lucide-angular [img]="prevIcon" [size]="20" />
            </button>
            <span class="text-eyebrow flex-1 text-center">{{ eyebrow() }}</span>
            <span class="w-9"></span>
          </div>
          <div class="mt-3 flex items-center" aria-hidden="true">
            <span class="relative block h-3 flex-1">
              <span class="m-baste absolute inset-x-0 top-1/2 -translate-y-1/2"></span>
              <span class="m-done absolute left-0 top-1/2 -translate-y-1/2" [style.width.%]="mobilePct()"></span>
              <span
                class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-trama-knot transition-[left] duration-500"
                [style.left.%]="mobilePct()"
              ></span>
            </span>
          </div>
          <p class="mt-3 text-[13px] font-semibold text-trama-body">
            Paso {{ current() + 1 }} de {{ steps().length }} · {{ step()?.label }}
          </p>
        </div>

        <p class="text-eyebrow hidden sm:block">
          {{ eyebrow() }}@if (!done()) { · Paso {{ current() + 1 }} de {{ steps().length }}}
        </p>
        @if (!done()) {
          <h1 class="mt-1.5 font-display text-[25px] font-bold leading-[1.1] tracking-[-0.02em] text-trama-dark sm:mt-2 sm:text-[32px]">
            {{ step()?.title }}
          </h1>
        } @else {
          <h1 class="sr-only">{{ doneTitle() }}</h1>
        }
        @if (!done() && step()?.lead) {
          <p class="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-trama-body sm:text-base">{{ step()?.lead }}</p>
        }

        <app-seam
          class="mt-6 hidden sm:block"
          [steps]="labels()"
          [current]="current()"
          [allDone]="done()"
          [radius]="18"
          [navigable]="!done()"
          (stepClick)="goTo($event)"
        />
      </header>

      <!-- Cuerpo -->
      @if (done()) {
        <div class="px-5 pb-10 sm:px-10">
          <ng-content select="[result]" />
        </div>
      } @else {
        <div class="grid gap-8 px-5 pb-8 pt-4 sm:px-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div class="min-w-0">
            @for (k of [current()]; track k) {
              <div [class]="dir() > 0 ? 'step-in-right' : dir() < 0 ? 'step-in-left' : ''">
                <ng-content />
              </div>
            }
          </div>

          @if (summary().length) {
            <aside
              class="self-start rounded-[18px] bg-trama-sand-50 p-5"
              [class]="isLast() ? 'block' : 'hidden lg:block'"
            >
              <p class="text-eyebrow">{{ summaryTitle() }}</p>
              <ul class="mt-3 space-y-3.5">
                @for (row of summary(); track row.label) {
                  <li class="flex items-start gap-3">
                    @if (row.value !== null) {
                      <span class="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-trama-dark">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F2B636" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      </span>
                    } @else {
                      <span class="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-dashed border-trama-thread-faint"></span>
                    }
                    <span class="min-w-0">
                      <span class="block text-[13px] text-trama-body">{{ row.label }}</span>
                      <span
                        class="block truncate text-[15px] font-bold"
                        [class]="row.value !== null ? 'text-trama-dark' : 'text-[#9A9384]'"
                        >{{ row.value ?? 'Pendiente' }}</span
                      >
                    </span>
                  </li>
                }
              </ul>
            </aside>
          }
        </div>

        <!-- Barra fija -->
        <footer
          class="bar sticky bottom-0 z-10 flex items-center gap-3 border-t border-trama-sand-100 bg-trama-sand-50 px-5 py-3.5 sm:px-10"
        >
          <button
            type="button"
            class="t-btn t-btn-ghost hidden !px-3 sm:inline-flex"
            [disabled]="current() === 0 || busy()"
            (click)="back.emit()"
          >
            <lucide-angular [img]="prevIcon" [size]="18" />
            Anterior
          </button>
          <span class="hidden flex-1 text-center text-sm text-trama-body sm:block">{{ status() }}</span>
          <button
            type="button"
            class="t-btn t-btn-primary w-full sm:w-auto"
            [disabled]="busy()"
            (click)="next.emit()"
          >
            {{ isLast() ? (busy() ? busyLabel() : finishLabel()) : 'Siguiente' }}
            @if (!isLast()) {
              <lucide-angular [img]="nextIcon" [size]="18" />
            }
          </button>
        </footer>
      }
    </div>
  `,
  styles: `
    .wizard {
      box-shadow: var(--shadow-wizard);
    }
    @media (max-width: 639.98px) {
      .wizard {
        margin: -24px -16px 0;
        box-shadow: none;
        min-height: calc(100dvh - 60px);
      }
      .bar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: calc(58px + env(safe-area-inset-bottom));
        z-index: 35;
      }
    }
    .step-in-right {
      animation: t-slide-in-right 250ms cubic-bezier(0.2, 0.8, 0.3, 1) backwards;
    }
    .step-in-left {
      animation: t-slide-in-left 250ms cubic-bezier(0.2, 0.8, 0.3, 1) backwards;
    }
    .m-baste {
      height: 3px;
      background-image: linear-gradient(to right, #d6cfbb 8px, transparent 8px);
      background-size: 14px 3px;
      background-repeat: repeat-x;
    }
    .m-done {
      height: 4px;
      background-image: linear-gradient(to right, #1f3a2b 9px, transparent 9px);
      background-size: 15px 4px;
      background-repeat: repeat-x;
      transition: width 500ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
  `,
})
export class WizardShell {
  readonly eyebrow = input.required<string>();
  readonly steps = input.required<readonly WizardStep[]>();
  /** Paso actual, desde 0. */
  readonly current = input.required<number>();
  readonly summary = input<readonly WizardSummaryRow[]>([]);
  readonly summaryTitle = input('Resumen');
  readonly finishLabel = input('Confirmar');
  readonly busyLabel = input('Enviando…');
  readonly busy = input(false);
  readonly done = input(false);
  readonly doneTitle = input('Listo');
  /** Texto del centro de la barra ("Guardado automáticamente"). */
  readonly status = input('');

  readonly next = output<void>();
  readonly back = output<void>();
  readonly stepChange = output<number>();

  protected readonly prevIcon = ChevronLeft;
  protected readonly nextIcon = ChevronRight;

  protected readonly step = computed<WizardStep | undefined>(() => this.steps()[this.current()]);
  protected readonly labels = computed(() => this.steps().map((s) => s.label));
  protected readonly isLast = computed(() => this.current() === this.steps().length - 1);
  protected readonly mobilePct = computed(() => {
    const n = this.steps().length;
    return n > 1 ? (this.current() / (n - 1)) * 100 : 100;
  });

  /** +1 si se avanzó, −1 si se retrocedió, 0 al entrar. */
  protected readonly dir = signal(0);
  private previous = -1;

  constructor() {
    effect(() => {
      const c = this.current();
      untracked(() => {
        this.dir.set(this.previous < 0 ? 0 : Math.sign(c - this.previous));
        this.previous = c;
      });
    });
  }

  protected goTo(i: number): void {
    if (i < this.current()) this.stepChange.emit(i);
  }
}
