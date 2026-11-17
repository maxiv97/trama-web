import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  SeamButton,
  SeamOutcome,
  SeamStepState,
} from '../../../../../src/app/shared/components/seam/seam-button';

function render(state: SeamStepState, inputs: { radius?: number; outcome?: SeamOutcome } = {}) {
  const fixture = TestBed.createComponent(SeamButton);
  fixture.componentRef.setInput('state', state);
  if (inputs.radius) fixture.componentRef.setInput('radius', inputs.radius);
  if (inputs.outcome) fixture.componentRef.setInput('outcome', inputs.outcome);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SeamButton', () => {
  it('es solo dibujo: el lector lee el texto del paso, no el botón', () => {
    expect(render('done').getAttribute('aria-hidden')).toBe('true');
  });

  it('todos los estados tienen cuatro agujeros', () => {
    for (const state of ['done', 'current', 'pending'] as const) {
      expect(render(state).querySelectorAll('.hole')).toHaveLength(4);
    }
  });

  it('el hecho lleva la cruz de hilo y no el anillo', () => {
    const host = render('done');
    expect(host.classList.contains('done')).toBe(true);
    expect(host.querySelector('.cross')).not.toBeNull();
    expect(host.querySelector('.ring')).toBeNull();
  });

  it('el actual lleva el anillo y no la cruz', () => {
    const host = render('current');
    expect(host.querySelector('.ring')).not.toBeNull();
    expect(host.querySelector('.cross')).toBeNull();
  });

  it('el pendiente no lleva ni cruz ni anillo', () => {
    const host = render('pending');
    expect(host.querySelector('.ring')).toBeNull();
    expect(host.querySelector('.cross')).toBeNull();
  });

  it('cerrado en un paso negativo: anillo rojo sobre el botón sin coser', () => {
    const host = render('current', { outcome: 'negative' });
    expect(host.classList.contains('negative')).toBe(true);
    expect(host.querySelector('.ring')).not.toBeNull();
    expect(host.querySelector('.cross')).toBeNull();
  });

  it('final natural: el botón va hecho, con su cruz, y lleva el anillo verde', () => {
    const host = render('done', { outcome: 'complete' });
    expect(host.classList.contains('complete')).toBe(true);
    expect(host.querySelector('.cross')).not.toBeNull();
    expect(host.querySelector('.ring')).not.toBeNull();
  });

  it('se escala entero según el radio: 64 px a radio 22, 48 px a radio 16,5', () => {
    expect(render('pending').querySelector('svg')?.getAttribute('width')).toBe('64');
    expect(render('pending', { radius: 16.5 }).querySelector('svg')?.getAttribute('width')).toBe(
      '48',
    );
  });
});
