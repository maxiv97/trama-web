import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { StatCard } from '../../../../../src/app/shared/components/stat-card/stat-card';

function render(inputs: { subtitle?: string; color?: 'default' | 'green' | 'red' } = {}) {
  const fixture = TestBed.createComponent(StatCard);
  fixture.componentRef.setInput('title', 'Vendidas');
  fixture.componentRef.setInput('value', 37);
  if (inputs.subtitle) fixture.componentRef.setInput('subtitle', inputs.subtitle);
  if (inputs.color) fixture.componentRef.setInput('color', inputs.color);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

@Component({
  imports: [StatCard],
  template: `<app-stat-card featured title="Ganancia del mes" value="$482.000" />`,
})
class FeaturedHost {}

describe('StatCard', () => {
  it('muestra la etiqueta y el número con cifras tabulares', () => {
    const host = render();
    expect(host.querySelector('.label')?.textContent?.trim()).toBe('Vendidas');
    const value = host.querySelector('.value');
    expect(value?.textContent?.trim()).toBe('37');
    expect(value?.classList.contains('trama-number')).toBe(true);
  });

  it('la aclaración aparece solo si hay', () => {
    expect(render().querySelector('.note')).toBeNull();
    expect(render({ subtitle: '+5 esta semana' }).querySelector('.note')?.textContent?.trim()).toBe(
      '+5 esta semana',
    );
  });

  it('el color del número se elige con color', () => {
    expect(render().classList.contains('tone-default')).toBe(true);
    expect(render({ color: 'red' }).classList.contains('tone-red')).toBe(true);
    expect(render({ color: 'green' }).classList.contains('tone-green')).toBe(true);
  });

  it('un KPI común no lleva subrayado', () => {
    const host = render();
    expect(host.classList.contains('featured')).toBe(false);
    expect(host.querySelector('app-stitch')).toBeNull();
  });

  it('el destacado lleva el subrayado con nudo, que se cose al aparecer', () => {
    const fixture = TestBed.createComponent(FeaturedHost);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector('app-stat-card')!;
    expect(card.classList.contains('featured')).toBe(true);
    const stitch = card.querySelector('app-stitch');
    expect(stitch?.querySelector('.knot')).not.toBeNull();
    expect(stitch?.classList.contains('is-sewing')).toBe(true);
  });
});
