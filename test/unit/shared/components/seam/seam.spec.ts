import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Seam } from '../../../../../src/app/shared/components/seam/seam';
import { SeamOutcome } from '../../../../../src/app/shared/components/seam/seam-button';

const STEPS = ['Cargada', 'En revisión', 'Acordada', 'Recepcionada', 'En stock'];

function render(current: number, outcome?: SeamOutcome) {
  const fixture = TestBed.createComponent(Seam);
  fixture.componentRef.setInput('steps', STEPS);
  fixture.componentRef.setInput('current', current);
  if (outcome) fixture.componentRef.setInput('outcome', outcome);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function states(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll('app-seam-button')).map(
    (button) => ['done', 'current', 'pending'].find((state) => button.classList.contains(state))!,
  );
}

describe('Seam', () => {
  it('es una lista ordenada con un ítem por paso', () => {
    const items = render(0).querySelectorAll('ol > li');
    expect(Array.from(items).map((li) => li.querySelector('.label')?.textContent?.trim())).toEqual(
      STEPS,
    );
  });

  it('lo anterior al paso actual está hecho y lo siguiente, pendiente', () => {
    expect(states(render(3))).toEqual(['done', 'done', 'done', 'current', 'pending']);
  });

  it('el paso actual lleva aria-current y cada paso dice su estado al lector', () => {
    const items = render(1).querySelectorAll('ol > li');
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[0].getAttribute('aria-current')).toBeNull();
    expect(items[0].querySelector('.sr-only')?.textContent).toBe('(hecho)');
    expect(items[2].querySelector('.sr-only')?.textContent).toBe('(pendiente)');
  });

  it('cerrado en un paso negativo: se cose hasta ese paso, que lleva el anillo rojo', () => {
    const host = render(2, 'negative');
    const buttons = host.querySelectorAll('app-seam-button');
    expect(states(host)).toEqual(['done', 'done', 'current', 'pending', 'pending']);
    expect(buttons[2].classList.contains('negative')).toBe(true);
    expect(buttons[1].classList.contains('negative')).toBe(false);
    expect(host.querySelector('.sewn')?.getAttribute('style')).toContain('* 2)');
    expect(host.querySelectorAll('ol > li')[2].querySelector('.sr-only')?.textContent).toBe(
      '(se cerró en este paso)',
    );
  });

  it('final natural: todo cosido, sin hilván, y el último paso hecho con anillo verde', () => {
    const host = render(STEPS.length - 1, 'complete');
    const buttons = host.querySelectorAll('app-seam-button');
    expect(states(host)).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(buttons[4].classList.contains('complete')).toBe(true);
    expect(host.querySelector('.basted')).toBeNull();
    expect(host.querySelector('.sewn')?.getAttribute('style')).toContain('* 4)');
    expect(host.querySelectorAll('ol > li')[4].querySelector('.sr-only')?.textContent).toBe(
      '(completado)',
    );
  });

  it('el hilo cosido llega al último paso hecho y se cose al aparecer', () => {
    const sewn = render(3).querySelector('.sewn');
    expect(sewn?.getAttribute('style')).toContain('* 0.5');
    expect(sewn?.getAttribute('style')).toContain('* 2)');
    expect(sewn?.querySelector('app-stitch')?.classList.contains('is-sewing')).toBe(true);
  });

  it('con uno o ningún paso hecho no hay tramo cosido, todo es hilván', () => {
    expect(render(0).querySelector('.sewn')).toBeNull();
    expect(render(1).querySelector('.sewn')).toBeNull();
    expect(render(1).querySelector('.basted')).not.toBeNull();
  });

  it('en el último paso, el hilván queda solo en el tramo que llega a él', () => {
    const host = render(STEPS.length - 1);
    expect(host.querySelector('.basted')).not.toBeNull();
    expect(host.querySelector('.sewn')).not.toBeNull();
  });

  it('las columnas salen de la cantidad de pasos', () => {
    expect(render(0).style.getPropertyValue('--seam-steps')).toBe('5');
  });

  it('la costura mini guarda los nombres para el lector y cose sin revés', () => {
    const fixture = TestBed.createComponent(Seam);
    fixture.componentRef.setInput('steps', STEPS);
    fixture.componentRef.setInput('current', 3);
    fixture.componentRef.setInput('mini', true);
    fixture.componentRef.setInput('radius', 8);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('mini')).toBe(true);
    expect(host.querySelector('.label')).toBeNull();
    expect(host.querySelector('li .sr-only')?.textContent).toBe('Cargada');
    expect(host.querySelector('.sewn app-stitch')).toBeNull();
    expect(host.querySelector('.sewn .mini-thread')).not.toBeNull();
  });
});
