import { afterRenderEffect, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TabOption, Tabs } from '../../../shared/components/tabs/tabs';
import { CedentesCard } from './cards/cedentes-card';
import { ConvieneCard } from './cards/conviene-card';
import { DeboCard } from './cards/debo-card';
import { DiscrepanciasCard } from './cards/discrepancias-card';
import { PdvCard } from './cards/pdv-card';
import { PlazosCard } from './cards/plazos-card';
import { RotaCard } from './cards/rota-card';
import { TardoCard } from './cards/tardo-card';
import { ReportsFilterBar } from './filter-bar/filter-bar';

type ReportTab = 'pagos' | 'financiera' | 'stock' | 'cedentes';
type ReportCard =
  | 'debo'
  | 'plazos'
  | 'tardo'
  | 'conviene'
  | 'pdv'
  | 'rota'
  | 'cedentes'
  | 'discrepancias';

interface ReportSection {
  tab: ReportTab;
  label: string;
  cards: ReportCard[];
  questions: { label: string; card: ReportCard }[];
}

const SECTIONS: ReportSection[] = [
  {
    tab: 'pagos',
    label: 'Pagos y plazos',
    cards: ['debo', 'plazos', 'tardo'],
    questions: [
      { label: '¿Cuánto debo y qué está vencido?', card: 'debo' },
      { label: '¿Qué plazos están por vencer?', card: 'plazos' },
      { label: '¿Cuánto tardo en liquidar?', card: 'tardo' },
    ],
  },
  {
    tab: 'financiera',
    label: 'Financiera',
    cards: ['conviene', 'pdv'],
    questions: [
      { label: '¿Qué me conviene recibir?', card: 'conviene' },
      { label: '¿Cuánto gané por punto de venta?', card: 'pdv' },
      { label: '¿Cuál es mi ticket promedio?', card: 'pdv' },
    ],
  },
  {
    tab: 'stock',
    label: 'Stock y rotación',
    cards: ['rota'],
    questions: [
      { label: '¿Qué stock no rota?', card: 'rota' },
      { label: '¿Cuánto tarda en venderse una prenda?', card: 'conviene' },
    ],
  },
  {
    tab: 'cedentes',
    label: 'Cedentes',
    cards: ['cedentes', 'discrepancias'],
    questions: [
      { label: '¿Quiénes me dan más ganancia?', card: 'cedentes' },
      { label: '¿Qué cedentes venden mejor lo que recibo?', card: 'cedentes' },
      { label: '¿Cuántas prendas recibidas tuvieron observaciones?', card: 'discrepancias' },
    ],
  },
];

const TAB_OPTIONS: TabOption[] = SECTIONS.map(({ tab, label }) => ({ value: tab, label }));

function sectionOf(tab: string | null): ReportSection {
  return SECTIONS.find((section) => section.tab === tab) ?? SECTIONS[0];
}

function tabOf(card: ReportCard): ReportTab {
  return SECTIONS.find((section) => section.cards.includes(card))!.tab;
}

@Component({
  selector: 'app-reports',
  imports: [
    RouterLink,
    Tabs,
    ReportsFilterBar,
    DeboCard,
    PlazosCard,
    TardoCard,
    ConvieneCard,
    PdvCard,
    RotaCard,
    CedentesCard,
    DiscrepanciasCard,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-semibold text-trama-dark">Reportes</h1>
        <p class="mt-1 text-sm text-trama-dark/50">
          Elegí un recorte y una sección. Tocá una pregunta para ir a su tarjeta.
        </p>
      </div>

      <!-- block: el componente es en línea y no tomaría el espacio de space-y -->
      <app-reports-filter-bar class="block" />

      <app-tabs
        #tabs
        ariaLabel="Secciones de reportes"
        [options]="tabOptions"
        [value]="section().tab"
        (valueChange)="openTab($event)"
      />

      <section
        role="tabpanel"
        class="space-y-6"
        [id]="tabs.panelId(section().tab)"
        [attr.aria-labelledby]="tabs.tabId(section().tab)"
      >
        <nav class="questions" aria-label="¿Qué querés saber?">
          @for (question of section().questions; track question.label) {
            <a
              class="question"
              routerLink="."
              replaceUrl
              [queryParams]="{ seccion: tabOf(question.card), tarjeta: question.card }"
              (click)="target.set(question.card)"
            >
              {{ question.label }}
            </a>
          }
        </nav>

        @switch (section().tab) {
          @case ('pagos') {
            <app-debo-card />
            <app-plazos-card />
            <app-tardo-card />
          }
          @case ('financiera') {
            <app-conviene-card />
            <app-pdv-card />
          }
          @case ('stock') {
            <app-rota-card />
          }
          @case ('cedentes') {
            <app-cedentes-card />
            <app-discrepancias-card />
          }
        }
      </section>
    </div>
  `,
  styles: `
    .questions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .question {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 6px 14px;
      border: 1.5px solid var(--color-trama-thread-light);
      border-radius: 999px;
      color: var(--color-trama-dark);
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      transition: background-color var(--duration-fast);
    }

    .question:hover {
      background-color: var(--color-trama-sand-50);
    }

    .question:focus-visible {
      outline: 2px solid var(--color-trama-brand);
      outline-offset: 2px;
    }
  `,
})
export class Reports {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly tabOptions = TAB_OPTIONS;
  protected readonly tabOf = tabOf;
  protected readonly section = computed(() => sectionOf(this.params().get('seccion')));

  protected readonly target = signal(this.route.snapshot.queryParamMap.get('tarjeta'));

  constructor() {
    afterRenderEffect(() => {
      const card = this.target();
      this.section();
      if (!card) return;
      const element = document.getElementById(`rep-${card}`);
      if (!element) return;
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.target.set(null);
    });
  }

  /** Al cambiar de pestaña, la tareta de la URL ya no aplica. */
  protected openTab(tab: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { seccion: tab, tarjeta: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
