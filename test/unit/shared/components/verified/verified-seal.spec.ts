import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  VerifiedSeal,
  VerifiedState,
} from '../../../../../src/app/shared/components/verified/verified-seal';

function render(
  inputs: { size?: number; state?: VerifiedState; ringed?: boolean; label?: string } = {},
) {
  const fixture = TestBed.createComponent(VerifiedSeal);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('VerifiedSeal', () => {
  it('chico (18 px) es el parche con el tilde, sin pespunte', () => {
    const host = render();
    expect(host.querySelector('svg')?.getAttribute('width')).toBe('18');
    expect(host.querySelector('.patch')).not.toBeNull();
    expect(host.querySelector('.inner-stitch')).toBeNull();
  });

  it('de 32 px para arriba lleva el pespunte blanco interior', () => {
    expect(render({ size: 32 }).querySelector('.inner-stitch')).not.toBeNull();
    expect(render({ size: 72 }).querySelector('.inner-stitch')).not.toBeNull();
  });

  it('el tilde se engrosa al achicarse', () => {
    expect(render({ size: 72 }).querySelector('.tick')?.getAttribute('stroke-width')).toBe('4.5');
    expect(render({ size: 32 }).querySelector('.tick')?.getAttribute('stroke-width')).toBe('6');
  });

  it('en verificación: círculo hilvanado y tilde gris, sin parche', () => {
    const host = render({ size: 32, state: 'pending' });
    expect(host.querySelector('.basted')).not.toBeNull();
    expect(host.querySelector('.pending-tick')).not.toBeNull();
    expect(host.querySelector('.patch')).toBeNull();
  });

  it('sobre un avatar lleva el borde papel', () => {
    const host = render({ size: 26, ringed: true });
    expect(host.querySelector('.paper')).not.toBeNull();
    expect(host.querySelector('.patch')?.getAttribute('r')).toBe('26');
  });

  it('con label lo anuncia el lector; sin label es solo dibujo', () => {
    const labelled = render({ label: 'Comercio verificado' });
    expect(labelled.getAttribute('role')).toBe('img');
    expect(labelled.getAttribute('aria-label')).toBe('Comercio verificado');
    expect(labelled.getAttribute('aria-hidden')).toBeNull();

    const decorative = render();
    expect(decorative.getAttribute('aria-hidden')).toBe('true');
    expect(decorative.getAttribute('role')).toBeNull();
  });
});
