import { BarChart3 } from 'lucide-angular';
import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Tabs } from '../../../shared/components/tabs/tabs';
import { CedentesCard } from './cards/cedentes-card';
import { ConvieneCard } from './cards/conviene-card';
import { CumplimientoCard } from './cards/cumplimiento-card';
import { DeboCard } from './cards/debo-card';
import { DiscrepanciasCard } from './cards/discrepancias-card';
import { PdvCard } from './cards/pdv-card';
import { PlazosCard } from './cards/plazos-card';
import { RotaCard } from './cards/rota-card';
import { TardoCard } from './cards/tardo-card';
import { VencimientosCard } from './cards/vencimientos-card';
import { ReportsFilterBar } from './filter-bar/filter-bar';
import { PageHeader } from '../../../shared/components/page-header/page-header';

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
      { label: '¿Qué pasa con lo que no se vende?', card: 'rep-vencimientos' },
    ],
  },
  {
    group: 'Cedentes',
    questions: [
      { label: '¿Quiénes me dan más ganancia?', card: 'rep-cedentes' },
      { label: '¿Qué cedentes venden mejor lo que recibo?', card: 'rep-cedentes' },
      { label: '¿Qué cedentes cumplen con los plazos?', card: 'rep-cumplimiento' },
      { label: '¿Cuántas prendas recibidas tuvieron observaciones?', card: 'rep-discrepancias' },
    ],
  },
];

@Component({
  selector: 'app-reports',
  imports: [PageHeader, Tabs, 
    ReportsFilterBar,
    DeboCard,
    PlazosCard,
    TardoCard,
    ConvieneCard,
    PdvCard,
    RotaCard,
    VencimientosCard,
    CedentesCard,
    CumplimientoCard,
    DiscrepanciasCard,
  ],
  template: `
    <div class="space-y-6">
      <app-page-header
        title="Reportes"
        section="Reportes"
        [icon]="headerIcon"
        lead="Elegí un recorte y respondé las preguntas del negocio. Tocá una pregunta para saltar a su tarjeta."
      />

      <app-reports-filter-bar />

      <app-tabs class="pt-2" [options]="tabOptions" [(value)]="tab" />

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-eyebrow mr-1">¿Qué querés saber?</span>
        @for (q of questions(); track q.label) {
          <button type="button" class="t-chip !py-1.5 text-[13px]" (click)="jumpTo(q.card)">{{ q.label }}</button>
        }
      </div>

      <div class="min-w-0 space-y-6">
        @switch (tab()) {
          @case ('Pagos y plazos') {
            <app-debo-card />
            <app-plazos-card />
            <app-tardo-card />
          }
          @case ('Financiera') {
            <app-conviene-card />
            <app-pdv-card />
          }
          @case ('Stock y rotación') {
            <app-rota-card />
            <app-vencimientos-card />
            <app-conviene-card />
          }
          @case ('Cedentes') {
            <app-cedentes-card />
            <app-cumplimiento-card />
            <app-discrepancias-card />
          }
        }
      </div>
    </div>
  `,
})
export class Reports {
  protected readonly headerIcon = BarChart3;
  protected readonly index = INDEX;
  private readonly route = inject(ActivatedRoute);

  protected readonly tabOptions = INDEX.map((e) => ({ value: e.group, label: e.group }));
  /** Pestaña inicial: la que contiene la tarjeta del fragmento (#rep-plazos), si viene uno. */
  protected readonly tab = signal(this.groupFor(this.route.snapshot.fragment) ?? INDEX[0].group);
  protected readonly questions = computed(
    () => INDEX.find((e) => e.group === this.tab())?.questions ?? [],
  );

  constructor() {
    const fragment = this.route.snapshot.fragment;
    if (fragment) afterNextRender(() => setTimeout(() => this.jumpTo(fragment), 400));
  }

  private groupFor(card: string | null): string | null {
    if (!card) return null;
    return INDEX.find((e) => e.questions.some((q) => q.card === card))?.group ?? null;
  }

  // Scroll to the card instead of a fragment href — a `#anchor` link changes the route under
  // hash-based routing (as in the prod deploy) and bounces to the landing.
  protected jumpTo(cardId: string): void {
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const group = this.groupFor(cardId);
    if (group && group !== this.tab()) {
      this.tab.set(group);
      setTimeout(() => document.getElementById(cardId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }

}
