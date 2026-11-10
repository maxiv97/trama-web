import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Stitch, StitchVariant } from '../../../../../src/app/shared/components/stitch/stitch';

function render(variant?: StitchVariant, sew = false) {
  const fixture = TestBed.createComponent(Stitch);
  if (variant) fixture.componentRef.setInput('variant', variant);
  fixture.componentRef.setInput('sew', sew);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return { fixture, host, lines: [...host.querySelectorAll('line')] };
}

describe('Stitch', () => {
  it('por defecto es el hilo cosido: verde profundo, 5 px, segmentos 12 y espacios 10', () => {
    const { lines } = render();
    expect(lines).toHaveLength(1);
    expect(lines[0].style.stroke).toBe('var(--color-trama-dark)');
    expect(lines[0].getAttribute('stroke-width')).toBe('5');
    expect(lines[0].getAttribute('stroke-dasharray')).toBe('12 10');
    expect(lines[0].getAttribute('stroke-linecap')).toBe('round');
  });

  it('el subrayado con nudo es naranja y termina en un nudo', () => {
    const { lines, host } = render('knot');
    expect(lines[0].style.stroke).toBe('var(--color-trama-knot)');
    expect(lines[0].getAttribute('stroke-dasharray')).toBe('12 9');
    expect(host.querySelector('.knot circle')).not.toBeNull();
  });

  it('solo el subrayado lleva nudo', () => {
    for (const variant of ['sewn', 'baste', 'back'] as const) {
      expect(render(variant).host.querySelector('.knot')).toBeNull();
    }
  });

  it('el hilván es más fino y con puntadas más cortas', () => {
    const { lines } = render('baste');
    expect(lines[0].style.stroke).toBe('var(--color-trama-thread-faint)');
    expect(lines[0].getAttribute('stroke-width')).toBe('3');
    expect(lines[0].getAttribute('stroke-dasharray')).toBe('8 7');
  });

  it('el revés va debajo del hilo cosido, corrido 11 px', () => {
    const { lines } = render('back');
    expect(lines).toHaveLength(2);
    expect(lines[0].getAttribute('stroke-dashoffset')).toBe('-11');
    expect(lines[1].style.stroke).toBe('var(--color-trama-dark)');
  });

  it('es decorativa para los lectores de pantalla', () => {
    expect(render().host.getAttribute('aria-hidden')).toBe('true');
  });

  it('sin animación no usa máscara', () => {
    const { host, lines } = render('sewn', false);
    expect(host.classList.contains('is-sewing')).toBe(false);
    expect(host.querySelector('mask')).toBeNull();
    expect(lines[0].getAttribute('mask')).toBeNull();
  });

  it('al coserse, cada puntada usa su propia máscara', () => {
    const first = render('sewn', true);
    const second = render('sewn', true);
    const firstId = first.host.querySelector('mask')!.id;
    const secondId = second.host.querySelector('mask')!.id;

    expect(first.host.classList.contains('is-sewing')).toBe(true);
    expect(first.lines[0].getAttribute('mask')).toBe(`url(#${firstId})`);
    expect(firstId).not.toBe(secondId);
  });
});
