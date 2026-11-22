import { Component, ElementRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Reports } from '../../../../../src/app/features/merchant/reports/reports';
import { CedentesCard } from '../../../../../src/app/features/merchant/reports/cards/cedentes-card';
import { ConvieneCard } from '../../../../../src/app/features/merchant/reports/cards/conviene-card';
import { DeboCard } from '../../../../../src/app/features/merchant/reports/cards/debo-card';
import { DiscrepanciasCard } from '../../../../../src/app/features/merchant/reports/cards/discrepancias-card';
import { PdvCard } from '../../../../../src/app/features/merchant/reports/cards/pdv-card';
import { PlazosCard } from '../../../../../src/app/features/merchant/reports/cards/plazos-card';
import { RotaCard } from '../../../../../src/app/features/merchant/reports/cards/rota-card';
import { TardoCard } from '../../../../../src/app/features/merchant/reports/cards/tardo-card';
import { ReportsFilterBar } from '../../../../../src/app/features/merchant/reports/filter-bar/filter-bar';

// Las tarjetas reales piden datos a la API: acá solo importa cuáles se dibujan.
// Una tarjeta falsa para los ocho selectores; el id sale de la etiqueta (app-debo-card → rep-debo).
@Component({
  selector:
    'app-debo-card, app-plazos-card, app-tardo-card, app-conviene-card, app-pdv-card, app-rota-card, app-cedentes-card, app-discrepancias-card',
  template: `<div [id]="id"></div>`,
})
class FakeCard {
  protected readonly id = (inject(ElementRef).nativeElement as HTMLElement).tagName
    .toLowerCase()
    .replace(/^app-(.*)-card$/, 'rep-$1');
}

@Component({ selector: 'app-reports-filter-bar', template: '' })
class FakeFilterBar {}

const REAL = [
  DeboCard,
  PlazosCard,
  TardoCard,
  ConvieneCard,
  PdvCard,
  RotaCard,
  CedentesCard,
  DiscrepanciasCard,
  ReportsFilterBar,
];
const FAKE = [FakeCard, FakeFilterBar];

let scrolled: string[];

beforeEach(() => {
  scrolled = [];
  // se anota a qué tarjeta se quiso llevar
  HTMLElement.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) {
    scrolled.push(this.id);
  });
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: 'm/reports', component: Reports }])],
  });
  TestBed.overrideComponent(Reports, { remove: { imports: REAL }, add: { imports: FAKE } });
});

async function open(url: string) {
  const harness = await RouterTestingHarness.create();
  // Que la pantalla se redibuje sola en cada recarga
  harness.fixture.autoDetectChanges();
  await harness.navigateByUrl(url, Reports);
  await harness.fixture.whenStable();
  const element = harness.routeNativeElement!;
  const cards = () => Array.from(element.querySelectorAll('[id^="rep-"]')).map((card) => card.id);
  const selected = () =>
    element.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim();
  // Después de un clic, que el router termine de navegar y la pantalla se vuelva a dibujar
  const settle = async () => {
    await new Promise((done) => setTimeout(done));
    await harness.fixture.whenStable();
  };
  return { harness, element, cards, selected, settle, router: TestBed.inject(Router) };
}

describe('Reports', () => {
  it('sin sección en la URL abre Pagos y plazos con sus tres tarjetas', async () => {
    const { selected, cards } = await open('/m/reports');
    expect(selected()).toBe('Pagos y plazos');
    expect(cards()).toEqual(['rep-debo', 'rep-plazos', 'rep-tardo']);
  });

  it('abre la sección que dice la URL', async () => {
    expect((await open('/m/reports?seccion=cedentes')).cards()).toEqual([
      'rep-cedentes',
      'rep-discrepancias',
    ]);
  });

  it('si la sección de la URL no existe, abre la primera', async () => {
    expect((await open('/m/reports?seccion=otra')).selected()).toBe('Pagos y plazos');
  });

  it('el panel queda unido a su pestaña', async () => {
    const { element } = await open('/m/reports?seccion=stock');
    const panel = element.querySelector('[role="tabpanel"]')!;
    const tab = element.querySelector('[role="tab"][aria-selected="true"]')!;
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
  });

  it('elegir otra pestaña cambia la URL y las tarjetas', async () => {
    const { element, cards, settle, router } = await open('/m/reports');
    const tabs = element.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs[1].click();
    await settle();
    expect(router.url).toBe('/m/reports?seccion=financiera');
    expect(cards()).toEqual(['rep-conviene', 'rep-pdv']);
  });

  it('cada pestaña muestra sus preguntas, y cada una apunta a su tarjeta', async () => {
    const { element } = await open('/m/reports?seccion=financiera');
    const questions = Array.from(element.querySelectorAll<HTMLAnchorElement>('.question'));
    expect(questions.map((q) => q.textContent?.trim())).toEqual([
      '¿Qué me conviene recibir?',
      '¿Cuánto gané por punto de venta?',
      '¿Cuál es mi ticket promedio?',
    ]);
    expect(questions[1].getAttribute('href')).toBe('/m/reports?seccion=financiera&tarjeta=pdv');
  });

  it('tocar una pregunta lleva a su tarjeta', async () => {
    const { element, settle } = await open('/m/reports');
    element.querySelectorAll<HTMLAnchorElement>('.question')[2].click();
    await settle();
    expect(scrolled).toEqual(['rep-tardo']);
  });

  it('una pregunta cuya tarjeta está en otra pestaña cambia de pestaña y lleva a ella', async () => {
    const { element, selected, settle, router } = await open('/m/reports?seccion=stock');
    const question = Array.from(element.querySelectorAll<HTMLAnchorElement>('.question')).find(
      (q) => q.textContent?.includes('tarda en venderse'),
    )!;
    question.click();
    await settle();
    expect(router.url).toBe('/m/reports?seccion=financiera&tarjeta=conviene');
    expect(selected()).toBe('Financiera');
    expect(scrolled).toEqual(['rep-conviene']);
  });

  it('un link compartido con tarjeta abre la pestaña y lleva a la tarjeta', async () => {
    const { selected } = await open('/m/reports?seccion=financiera&tarjeta=pdv');
    expect(selected()).toBe('Financiera');
    expect(scrolled).toEqual(['rep-pdv']);
  });
});
