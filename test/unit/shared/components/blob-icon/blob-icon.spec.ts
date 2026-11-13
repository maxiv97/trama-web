import { TestBed } from '@angular/core/testing';
import { Inbox } from 'lucide-angular';
import { describe, expect, it } from 'vitest';
import { BlobIcon, BlobTone } from '../../../../../src/app/shared/components/blob-icon/blob-icon';
import { Hanger } from '../../../../../src/app/shared/icons/hanger';

function render(options: { size?: number; tone?: BlobTone } = {}) {
  const fixture = TestBed.createComponent(BlobIcon);
  fixture.componentRef.setInput('icon', Inbox);
  if (options.size) fixture.componentRef.setInput('size', options.size);
  if (options.tone) fixture.componentRef.setInput('tone', options.tone);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host,
    blob: host.querySelector('svg.blob') as SVGSVGElement,
    glyph: host.querySelector('.glyph svg') as SVGSVGElement,
  };
}

describe('BlobIcon', () => {
  it('por defecto es el tamaño de encabezado: ícono de 18 sobre blob de 34', () => {
    const { blob, glyph } = render();
    expect(blob.getAttribute('width')).toBe('34');
    expect(glyph.getAttribute('width')).toBe('18');
  });

  it('en ilustraciones el ícono ocupa la mitad del blob', () => {
    expect(render({ size: 72 }).glyph.getAttribute('width')).toBe('36');
    expect(render({ size: 104 }).glyph.getAttribute('width')).toBe('52');
  });

  it('el blob es amarillo por defecto y cambia con el tono', () => {
    expect(render().blob.querySelector('path')!.style.fill).toBe('var(--color-trama-gold)');
    expect(render({ tone: 'peach' }).blob.querySelector('path')!.style.fill).toBe(
      'var(--color-trama-peach)',
    );
  });

  it('dibuja el ícono de Lucide que recibe', () => {
    const { glyph } = render();
    expect(glyph.querySelector('polyline')).not.toBeNull();
  });

  it('acepta la percha propia como cualquier ícono', () => {
    const fixture = TestBed.createComponent(BlobIcon);
    fixture.componentRef.setInput('icon', Hanger);
    fixture.detectChanges();
    const path = (fixture.nativeElement as HTMLElement).querySelector('.glyph path');
    expect(path?.getAttribute('d')).toContain('M10 6a2 2 0 1 1 2 2');
  });

  it('es decorativo para los lectores de pantalla', () => {
    expect(render().host.getAttribute('aria-hidden')).toBe('true');
  });

  it('como avatar muestra hasta dos iniciales en mayúscula, sin ícono', () => {
    const fixture = TestBed.createComponent(BlobIcon);
    fixture.componentRef.setInput('initials', 'lfx');
    fixture.componentRef.setInput('size', 64);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const initials = host.querySelector('.initials') as HTMLElement;

    expect(initials.textContent?.trim()).toBe('LF');
    expect(initials.style.fontSize).toBe('22px');
    expect(host.querySelector('.glyph')).toBeNull();
  });

  it('si recibe ícono e iniciales, gana el ícono', () => {
    const fixture = TestBed.createComponent(BlobIcon);
    fixture.componentRef.setInput('icon', Inbox);
    fixture.componentRef.setInput('initials', 'LF');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.glyph')).not.toBeNull();
    expect(host.querySelector('.initials')).toBeNull();
  });
});
