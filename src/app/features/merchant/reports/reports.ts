import { Component } from '@angular/core';
import { ConvieneCard } from './cards/conviene-card';
import { DeboCard } from './cards/debo-card';
import { PlazosCard } from './cards/plazos-card';
import { ReportsFilterBar } from './filter-bar/filter-bar';

interface IndexEntry {
  group: string;
  questions: { label: string; card: string }[];
}

// The "¿Qué querés saber?" index: each question jumps to its card and (from F2/F3) sets that
// card's sort. Cards are added in the following slices; the anchors resolve as they land.
const INDEX: IndexEntry[] = [
  {
    group: 'Pagos y plazos',
    questions: [
      { label: '¿Cuánto debo y qué está vencido?', card: 'rep-debo' },
      { label: '¿Qué plazos están por vencer?', card: 'rep-plazos' },
      { label: '¿Cuánto tardo en liquidar?', card: 'rep-tardo' },
    ],
  },
  {
    group: 'Financiera',
    questions: [
      { label: '¿Qué me conviene recibir?', card: 'rep-conviene' },
      { label: '¿Cuánto gané por punto de venta?', card: 'rep-pdv' },
      { label: '¿Cuál es mi ticket promedio?', card: 'rep-pdv' },
    ],
  },
  {
    group: 'Stock y rotación',
    questions: [
      { label: '¿Qué stock no rota?', card: 'rep-rota' },
      { label: '¿Cuánto tarda en venderse una prenda?', card: 'rep-conviene' },
    ],
  },
  {
    group: 'Cedentes',
    questions: [
      { label: '¿Quiénes me dan más ganancia?', card: 'rep-cedentes' },
      { label: '¿Qué cedentes venden mejor lo que recibo?', card: 'rep-cedentes' },
      { label: '¿Cuántas prendas recibidas tuvieron observaciones?', card: 'rep-discrepancias' },
    ],
  },
];

@Component({
  selector: 'app-reports',
  imports: [ReportsFilterBar, ConvieneCard, DeboCard, PlazosCard],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-semibold text-trama-dark">Reportes</h1>
        <p class="mt-1 text-sm text-trama-dark/50">
          Elegí un recorte y respondé las preguntas del negocio. Tocá una pregunta para saltar a su
          tarjeta.
        </p>
      </div>

      <app-reports-filter-bar />

      <div class="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav class="hidden self-start lg:sticky lg:top-4 lg:block">
          <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-trama-dark/40">
            ¿Qué querés saber?
          </div>
          <div class="space-y-4">
            @for (entry of index; track entry.group) {
              <div>
                <div class="mb-1 text-xs font-medium text-trama-dark/50">{{ entry.group }}</div>
                <div class="space-y-0.5">
                  @for (q of entry.questions; track q.label) {
                    <a
                      [href]="'#' + q.card"
                      class="block rounded-md px-2 py-1.5 text-sm text-trama-dark/70 hover:bg-trama-sand-100"
                    >
                      {{ q.label }}
                    </a>
                  }
                </div>
              </div>
            }
          </div>
        </nav>

        <div class="min-w-0 space-y-6">
          <app-conviene-card />
          <app-debo-card />
          <app-plazos-card />
        </div>
      </div>
    </div>
  `,
})
export class Reports {
  protected readonly index = INDEX;
}
