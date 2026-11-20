import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { ChipOption, Chips } from '../../../../../src/app/shared/components/chips/chips';

const FILTERS: ChipOption[] = [
  { value: 'in_stock', label: 'En stock', count: 214 },
  { value: 'sold', label: 'Vendidas', count: 38 },
  { value: 'returned', label: 'Devueltas', count: 0 },
];

const CONDITIONS: ChipOption[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'very_good', label: 'Muy bueno' },
  { value: 'good', label: 'Bueno' },
];

@Component({
  imports: [Chips],
  template: `<app-chips ariaLabel="Estado" [options]="options" [(value)]="status" />`,
})
class FilterHost {
  options = FILTERS;
  status = signal<string | null>('in_stock');
}

@Component({
  imports: [Chips, ReactiveFormsModule],
  template: `<app-chips
    ariaLabel="Estado de la prenda"
    [options]="options"
    [formControl]="condition"
  />`,
})
class FormHost {
  options = CONDITIONS;
  condition = new FormControl<string | null>(null);
}

function setup<T>(host: new () => T) {
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const chips = () => Array.from(element.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  return { fixture, element, chips };
}

describe('Chips', () => {
  it('es un grupo de radios con su nombre', () => {
    const { element } = setup(FilterHost);
    const group = element.querySelector('app-chips')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Estado');
  });

  it('el elegido está marcado y es el único que recibe el Tab', () => {
    const { chips } = setup(FilterHost);
    expect(chips().map((chip) => chip.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    expect(chips().map((chip) => chip.tabIndex)).toEqual([0, -1, -1]);
  });

  it('el filtro muestra su contador, también cuando es cero', () => {
    const { chips } = setup(FilterHost);
    expect(chips()[0].querySelector('.count')?.textContent?.trim()).toBe('214');
    expect(chips()[2].querySelector('.count')?.textContent?.trim()).toBe('0');
  });

  it('al tocar un chip cambia el valor (two-way con signals)', () => {
    const { fixture, chips } = setup(FilterHost);
    chips()[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.status()).toBe('sold');
    expect(chips()[1].getAttribute('aria-checked')).toBe('true');
  });

  it('las flechas eligen el vecino y le pasan el foco; al final vuelven al principio', () => {
    const { fixture, element, chips } = setup(FilterHost);
    document.body.appendChild(element);
    chips()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.status()).toBe('returned');
    expect(document.activeElement).toBe(chips()[2]);
    element.remove();
  });

  it('sin contador es una elección de formulario; sin valor, el primero recibe el Tab', () => {
    const { chips } = setup(FormHost);
    expect(chips()[0].querySelector('.count')).toBeNull();
    expect(chips()[0].tabIndex).toBe(0);
  });

  it('con formularios reactivos toma y actualiza el valor', () => {
    const { fixture, chips } = setup(FormHost);
    chips()[1].click();
    expect(fixture.componentInstance.condition.value).toBe('very_good');
    fixture.componentInstance.condition.setValue('good');
    fixture.detectChanges();
    expect(chips()[2].getAttribute('aria-checked')).toBe('true');
  });

  it('el control deshabilitado deshabilita los chips', () => {
    const { fixture, chips } = setup(FormHost);
    fixture.componentInstance.condition.disable();
    fixture.detectChanges();
    expect(chips().every((chip) => chip.disabled)).toBe(true);
  });
});
