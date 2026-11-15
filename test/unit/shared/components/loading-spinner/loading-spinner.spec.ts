import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LoadingSpinner } from '../../../../../src/app/shared/components/loading-spinner/loading-spinner';

function render(label?: string) {
  const fixture = TestBed.createComponent(LoadingSpinner);
  if (label) fixture.componentRef.setInput('label', label);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

@Component({
  imports: [LoadingSpinner],
  template: `<app-loading-spinner compact />`,
})
class CompactHost {}

describe('LoadingSpinner', () => {
  it('está cargando', () => {
    const host = render();
    expect(host.getAttribute('role')).toBe('status');
    expect(host.querySelector('.sr-only')?.textContent?.trim()).toBe('Cargando…');
  });

  it('el texto anunciado se puede cambiar', () => {
    expect(render('Buscando prendas…').querySelector('.sr-only')?.textContent?.trim()).toBe(
      'Buscando prendas…',
    );
  });

  it('dibuja la aguja sobre el hilo y su revés, oculta para el lector', () => {
    const svg = render().querySelector('svg.sewing')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('.thread')).toHaveLength(2);
    expect(svg.querySelector('.thread.underside')).not.toBeNull();
    expect(svg.querySelector('.needle .eye')).not.toBeNull();
  });

  it('por defecto ocupa la pantalla; con compact se achica para una tarjeta', () => {
    expect(render().classList.contains('compact')).toBe(false);

    const fixture = TestBed.createComponent(CompactHost);
    fixture.detectChanges();
    const loader = (fixture.nativeElement as HTMLElement).querySelector('app-loading-spinner');
    expect(loader?.classList.contains('compact')).toBe(true);
  });
});
