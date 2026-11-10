import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PageHeader } from '../../../../../src/app/shared/components/page-header/page-header';
import { Hanger } from '../../../../../src/app/shared/icons/hanger';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(PageHeader);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header title="Inventario">
      <button pageActions type="button">Cargar prenda</button>
    </app-page-header>
  `,
})
class HostWithActions {}

describe('PageHeader', () => {
  it('muestra el título como el h1 de la página', () => {
    const host = render({ title: 'Inventario' });
    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Inventario');
  });

  it('muestra la sección con su ícono sobre el blob y el rol', () => {
    const host = render({ title: 'Inventario', eyebrow: 'Comercio', icon: Hanger, tone: 'peach' });
    expect(host.querySelector('.trama-eyebrow')?.textContent?.trim()).toBe('Comercio');
    expect(host.querySelector('app-blob-icon')).not.toBeNull();
  });

  it('sin rol no muestra la fila de sección', () => {
    const host = render({ title: 'Inventario' });
    expect(host.querySelector('.section')).toBeNull();
  });

  it('muestra la bajada cuando la recibe', () => {
    const host = render({ title: 'Inventario', lead: '214 prendas en stock.' });
    expect(host.querySelector('.lead')?.textContent?.trim()).toBe('214 prendas en stock.');
  });

  it('la puntada con nudo solo aparece si se pide, y se cose al entrar', () => {
    expect(render({ title: 'Inventario' }).querySelector('app-stitch')).toBeNull();

    const stitch = render({ title: 'Buen día, Moda Circular', stitched: true }).querySelector(
      'app-stitch',
    );
    expect(stitch).not.toBeNull();
    expect(stitch?.classList.contains('is-sewing')).toBe(true);
    expect(stitch?.querySelector('.knot')).not.toBeNull();
  });

  it('proyecta las acciones de la página', () => {
    const fixture = TestBed.createComponent(HostWithActions);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('.actions button');
    expect(button?.textContent?.trim()).toBe('Cargar prenda');
  });
});
