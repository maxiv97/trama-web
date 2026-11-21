import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ItemCell } from '../../../../../src/app/shared/components/table/item-cell';

function render(inputs: { photo?: string; link?: unknown[]; name?: string } = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(ItemCell);
  fixture.componentRef.setInput('name', inputs.name ?? 'Campera de jean');
  fixture.componentRef.setInput('meta', 'Camperas · M');
  if (inputs.photo) fixture.componentRef.setInput('photo', inputs.photo);
  if (inputs.link) fixture.componentRef.setInput('link', inputs.link);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ItemCell', () => {
  it('muestra el nombre y el dato de abajo', () => {
    const host = render();
    expect(host.querySelector('.name')?.textContent?.trim()).toBe('Campera de jean');
    expect(host.querySelector('.trama-table__meta')?.textContent?.trim()).toBe('Camperas · M');
  });

  it('con foto, la miniatura es la foto (decorativa, carga diferida)', () => {
    const img = render({ photo: '/f.jpg' }).querySelector('img.trama-thumb')!;
    expect(img.getAttribute('src')).toBe('/f.jpg');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('sin foto, un blob girado con la percha, solo dibujo', () => {
    const blob = render().querySelector<HTMLElement>('.blob')!;
    expect(blob.getAttribute('aria-hidden')).toBe('true');
    expect(blob.style.rotate).not.toBe('');
    expect(blob.querySelector('lucide-angular')).not.toBeNull();
  });

  it('la misma prenda tiene siempre el mismo blob', () => {
    const first = render().querySelector<HTMLElement>('.blob')!.style.backgroundColor;
    TestBed.resetTestingModule();
    const again = render().querySelector<HTMLElement>('.blob')!.style.backgroundColor;
    expect(again).toBe(first);
  });

  it('con link, el nombre es el link al detalle (para el teclado y el lector)', () => {
    const link = render({ link: ['/m/inventory', 'g1'] }).querySelector('a.name');
    expect(link?.getAttribute('href')).toBe('/m/inventory/g1');
  });
});
