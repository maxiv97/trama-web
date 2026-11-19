import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ChartPoint } from '../../../../../src/app/shared/components/charts/chart-point';
import { BarList } from '../../../../../src/app/shared/components/charts/bar-list';

const AGING: ChartPoint[] = [
  { label: '0–30', value: 92 },
  { label: '31–90', value: 46 },
  { label: '+120', value: 8, tone: 'alert' },
];

function render(points: ChartPoint[], thin = false) {
  const fixture = TestBed.createComponent(BarList);
  fixture.componentRef.setInput('points', points);
  if (thin) fixture.componentRef.setInput('thin', true);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('BarList', () => {
  it('es una lista: cada fila tiene su etiqueta y su valor en texto', () => {
    const rows = render(AGING).querySelectorAll('li');
    expect(rows).toHaveLength(3);
    expect(rows[1].querySelector('.label')?.textContent?.trim()).toBe('31–90');
    expect(rows[1].querySelector('.value')?.textContent?.trim()).toBe('46');
  });

  it('el valor se puede mostrar con formato', () => {
    const host = render([{ label: 'Camperas', value: 96000, display: '$96k' }]);
    expect(host.querySelector('.value')?.textContent?.trim()).toBe('$96k');
  });

  it('el largo de cada barra es proporcional al mayor', () => {
    const bars = render(AGING).querySelectorAll<HTMLElement>('.bar');
    expect(bars[0].style.width).toBe('100%');
    expect(bars[1].style.width).toBe('50%');
  });

  it('el color sale del tono: serie en verde profundo y la alerta en rojo', () => {
    const bars = render(AGING).querySelectorAll('.bar');
    expect(bars[0].classList.contains('tone-main')).toBe(true);
    expect(bars[2].classList.contains('tone-alert')).toBe(true);
  });

  it('las barras se cosen una tras otra y son solo dibujo', () => {
    const host = render(AGING);
    const bars = host.querySelectorAll<HTMLElement>('.bar');
    expect(bars[2].style.getPropertyValue('--step')).toBe('2');
    expect(host.querySelector('.track')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('thin es la versión fina', () => {
    expect(render(AGING, true).classList.contains('thin')).toBe(true);
  });
});
