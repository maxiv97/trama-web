import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ChartPoint } from '../../../../../src/app/shared/components/charts/chart-point';
import { ColumnChart } from '../../../../../src/app/shared/components/charts/column-chart';

const WEEKS: ChartPoint[] = [
  { label: '1/9', value: 50, display: '$50k' },
  { label: '8/9', value: 25, display: '$25k' },
  { label: '15/9', value: 100, display: '$100k', tone: 'highlight' },
];

function render(points: ChartPoint[]) {
  const fixture = TestBed.createComponent(ColumnChart);
  fixture.componentRef.setInput('points', points);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ColumnChart', () => {
  it('una columna por dato, con su etiqueta debajo', () => {
    const items = render(WEEKS).querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].querySelector('.label')?.textContent?.trim()).toBe('1/9');
  });

  it('solo la columna destacada muestra el valor arriba, en amarillo', () => {
    const host = render(WEEKS);
    const values = host.querySelectorAll('.value');
    expect(values).toHaveLength(1);
    expect(values[0].textContent?.trim()).toBe('$100k');
    expect(host.querySelectorAll('.bar')[2].classList.contains('tone-highlight')).toBe(true);
  });

  it('el lector escucha el valor de cada columna', () => {
    const items = render(WEEKS).querySelectorAll('li');
    expect(items[1].querySelector('.sr-only')?.textContent?.trim()).toBe('$25k');
    expect(items[1].getAttribute('title')).toBe('8/9: $25k');
  });

  it('el alto es proporcional y deja lugar para el valor de arriba', () => {
    const bars = render(WEEKS).querySelectorAll<HTMLElement>('.bar');
    expect(bars[2].style.height).toBe('80%');
    expect(bars[0].style.height).toBe('40%');
  });
});
