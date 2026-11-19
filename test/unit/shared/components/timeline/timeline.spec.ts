import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GarmentEvent } from '../../../../../src/app/core/models/garment.model';
import { Timeline } from '../../../../../src/app/shared/components/timeline/timeline';

const EVENTS: GarmentEvent[] = [
  { date: new Date('2026-09-10T12:00:00Z'), actor: 'consignor', status: 'submitted' },
  { date: new Date('2026-09-12T12:00:00Z'), actor: 'merchant', status: 'agreed' },
  {
    date: new Date('2026-09-15T12:00:00Z'),
    actor: 'merchant',
    status: 'with_remarks',
    note: 'Falta un botón',
  },
];

function render(events: GarmentEvent[]) {
  const fixture = TestBed.createComponent(Timeline);
  fixture.componentRef.setInput('events', events);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Timeline', () => {
  it('es una lista con un ítem por evento, en el orden en que pasaron', () => {
    const items = render(EVENTS).querySelectorAll('ol > li');
    expect(items).toHaveLength(3);
    expect(items[0].querySelector('.who')?.textContent?.trim()).toBe('Cedente');
  });

  it('solo el último evento lleva el nudo naranja', () => {
    const items = Array.from(render(EVENTS).querySelectorAll('ol > li'));
    expect(items.map((li) => li.classList.contains('latest'))).toEqual([false, false, true]);
  });

  it('el hilo y los nudos son solo dibujo', () => {
    const threads = render(EVENTS).querySelectorAll('.thread');
    expect(threads).toHaveLength(3);
    threads.forEach((thread) => expect(thread.getAttribute('aria-hidden')).toBe('true'));
  });

  it('muestra quién lo hizo y la nota, si hay', () => {
    const last = render(EVENTS).querySelectorAll('ol > li')[2];
    expect(last.querySelector('.who')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Comercio - Falta un botón',
    );
  });

  it('la fecha va en un <time> con su valor en ISO, aunque la API la mande como texto', () => {
    const time = render([
      { date: '2026-09-12T12:00:00.000Z' as unknown as Date, actor: 'system', status: 'sold' },
    ]).querySelector('time');
    expect(time?.getAttribute('datetime')).toBe('2026-09-12T12:00:00.000Z');
  });

  it('sin eventos lo dice', () => {
    expect(render([]).querySelector('.empty')?.textContent?.trim()).toBe('Sin eventos todavía.');
  });
});
