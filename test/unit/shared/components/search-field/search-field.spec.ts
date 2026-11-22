import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SearchField } from '../../../../../src/app/shared/components/search-field/search-field';

@Component({
  imports: [SearchField],
  template: `<app-search-field placeholder="Buscar prenda o cedente" [(value)]="query" />`,
})
class Host {
  query = signal('');
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const input = element.querySelector('input')!;
  const type = (text: string) => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, element, input, type };
}

describe('SearchField', () => {
  it('es un campo de búsqueda con nombre para el lector', () => {
    const { input } = setup();
    expect(input.type).toBe('search');
    expect(input.getAttribute('aria-label')).toBe('Buscar prenda o cedente');
  });

  it('lo que se escribe llega al valor mientras se escribe', () => {
    const { fixture, type } = setup();
    type('campera');
    expect(fixture.componentInstance.query()).toBe('campera');
  });

  it('sin texto no hay botón de borrar; con texto, sí', () => {
    const { element, type } = setup();
    expect(element.querySelector('.clear')).toBeNull();
    type('campera');
    expect(element.querySelector('.clear')?.getAttribute('aria-label')).toBe('Borrar búsqueda');
  });

  it('borrar vacía el valor y deja el foco en el campo', () => {
    const { fixture, element, input, type } = setup();
    document.body.appendChild(element);
    type('campera');
    element.querySelector<HTMLButtonElement>('.clear')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.query()).toBe('');
    expect(document.activeElement).toBe(input);
    element.remove();
  });

  it('Escape también lo vacía', () => {
    const { fixture, input, type } = setup();
    type('campera');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.query()).toBe('');
  });
});
