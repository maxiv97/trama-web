import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SeamSummary } from '../../../../../src/app/shared/components/seam/seam-summary';
import { SeamOutcome } from '../../../../../src/app/shared/components/seam/seam-button';

const STEPS = ['Cargada', 'En revisión', 'Acordada', 'Recepcionada', 'En stock'];

function render(current: number, outcome?: SeamOutcome) {
  const fixture = TestBed.createComponent(SeamSummary);
  fixture.componentRef.setInput('steps', STEPS);
  fixture.componentRef.setInput('current', current);
  if (outcome) fixture.componentRef.setInput('outcome', outcome);
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('SeamSummary', () => {
  it('dice en qué paso está, cuántos hay y cuál sigue', () => {
    const { host } = render(3);
    expect(host.querySelector('.count')?.textContent?.trim()).toBe('Paso 4 de 5');
    expect(host.querySelector('.name')?.textContent?.trim()).toBe('Recepcionada');
    expect(host.querySelector('.next')?.textContent?.trim()).toBe('Sigue: En stock');
  });

  it('si el proceso terminó no hay paso que siga', () => {
    expect(render(1, 'negative').host.querySelector('.next')).toBeNull();
    expect(render(4, 'complete').host.querySelector('.next')).toBeNull();
  });

  it('la costura mini es solo dibujo: el resumen ya lo dice en texto', () => {
    const mini = render(2).host.querySelector('app-seam');
    expect(mini?.classList.contains('mini')).toBe(true);
    expect(mini?.getAttribute('aria-hidden')).toBe('true');
  });

  it('el link despliega y repliega el recorrido vertical', () => {
    const { fixture, host } = render(2);
    const toggle = host.querySelector<HTMLButtonElement>('button.toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('ol.full')).toBeNull();

    toggle.click();
    fixture.detectChanges();
    const list = host.querySelector('ol.full')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe(list.id);
    expect(toggle.textContent?.trim()).toBe('Ocultar recorrido');
    expect(list.querySelectorAll('li')).toHaveLength(5);

    toggle.click();
    fixture.detectChanges();
    expect(host.querySelector('ol.full')).toBeNull();
  });

  it('en la lista vertical, el hilo va cosido hasta el último paso hecho', () => {
    const { fixture, host } = render(3);
    host.querySelector<HTMLButtonElement>('button.toggle')!.click();
    fixture.detectChanges();
    const items = Array.from(host.querySelectorAll('ol.full > li'));
    expect(items.map((li) => li.classList.contains('sewn'))).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(items[3].getAttribute('aria-current')).toBe('step');
  });
});
