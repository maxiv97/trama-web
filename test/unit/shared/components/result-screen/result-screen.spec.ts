import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  ResultScreen,
  ResultSummaryItem,
} from '../../../../../src/app/shared/components/result-screen/result-screen';

function render(inputs: { lead?: string; summary?: ResultSummaryItem[] } = {}) {
  const fixture = TestBed.createComponent(ResultScreen);
  fixture.componentRef.setInput('title', 'Venta registrada');
  if (inputs.lead) fixture.componentRef.setInput('lead', inputs.lead);
  if (inputs.summary) fixture.componentRef.setInput('summary', inputs.summary);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

@Component({
  imports: [ResultScreen],
  template: `
    <app-result-screen title="Prenda cargada">
      <button resultActions type="button" class="trama-btn">Cargar otra prenda</button>
      <button resultActions type="button" class="trama-btn trama-btn--outline">
        Ver seguimiento
      </button>
      <a resultActions class="trama-link">Volver al panel</a>
    </app-result-screen>
  `,
})
class HostWithActions {}

describe('ResultScreen', () => {
  it('el título es el h1 y va con la puntada con nudo, que se cose al entrar', () => {
    const host = render();
    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Venta registrada');
    const stitch = host.querySelector('app-stitch');
    expect(stitch?.querySelector('.knot')).not.toBeNull();
    expect(stitch?.classList.contains('is-sewing')).toBe(true);
  });

  it('ilustra con el ícono sobre un blob de éxito de 104 px', () => {
    const blob = render().querySelector('app-blob-icon svg.blob');
    expect(blob?.getAttribute('width')).toBe('104');
    expect(blob?.querySelector('path')?.getAttribute('style')).toContain('--color-trama-green-50');
  });

  it('muestra qué pasó en la bajada', () => {
    const host = render({ lead: 'La prenda pasó a vendida.' });
    expect(host.querySelector('.lead')?.textContent?.trim()).toBe('La prenda pasó a vendida.');
  });

  it('el resumen es una lista de datos en una tarjeta con hilván interior', () => {
    const host = render({
      summary: [
        { label: 'Precio de venta', value: '$25.700' },
        { label: 'A liquidar', value: '$18.000' },
      ],
    });
    const summary = host.querySelector('dl.summary')!;
    expect(summary.classList.contains('trama-inner-stitch')).toBe(true);
    expect(Array.from(summary.querySelectorAll('dt')).map((dt) => dt.textContent?.trim())).toEqual([
      'Precio de venta',
      'A liquidar',
    ]);
    expect(summary.querySelector('dd')?.textContent?.trim()).toBe('$25.700');
  });

  it('sin resumen no dibuja la tarjeta', () => {
    expect(render().querySelector('dl.summary')).toBeNull();
  });

  it('proyecta las salidas en orden: principal, secundaria y link', () => {
    const fixture = TestBed.createComponent(HostWithActions);
    fixture.detectChanges();
    const actions = (fixture.nativeElement as HTMLElement).querySelector('.actions')!;
    expect(Array.from(actions.children).map((child) => child.textContent?.trim())).toEqual([
      'Cargar otra prenda',
      'Ver seguimiento',
      'Volver al panel',
    ]);
  });
});
