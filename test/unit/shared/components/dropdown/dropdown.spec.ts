import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  Dropdown,
  DropdownOption,
} from '../../../../../src/app/shared/components/dropdown/dropdown';

const STATUSES: DropdownOption[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'in_stock', label: 'En stock' },
  { value: 'sold', label: 'Vendidas', hint: '38 este mes' },
];

const CATEGORIES: DropdownOption[] = [
  'Camperas y abrigos',
  'Calzado',
  'Vestidos',
  'Jeans',
  'Remeras',
  'Accesorios',
  'Carteras',
  'Sweaters',
].map((label) => ({ value: label, label }));

@Component({
  imports: [Dropdown],
  template: `<app-dropdown ariaLabel="Estado" [options]="options" [(value)]="status" />`,
})
class SignalHost {
  options = STATUSES;
  status = signal<string | null>('all');
}

@Component({
  imports: [Dropdown, ReactiveFormsModule],
  template: `<app-dropdown [options]="options" [formControl]="category" />`,
})
class FormHost {
  options = CATEGORIES;
  category = new FormControl<string | null>('Calzado');
}

function setup<T>(host: new () => T) {
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const trigger = element.querySelector<HTMLButtonElement>('button[role="combobox"]')!;
  const key = (target: HTMLElement, name: string) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
    fixture.detectChanges();
  };
  return { fixture, element, trigger, key };
}

describe('Dropdown', () => {
  it('muestra la opción elegida y es un combobox cerrado', () => {
    const { trigger } = setup(SignalHost);
    expect(trigger.textContent?.trim()).toBe('Todos los estados');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-label')).toBe('Estado');
  });

  it('al abrir, la lista marca la elegida y muestra el dato extra', async () => {
    const { fixture, element, trigger } = setup(SignalHost);
    trigger.click();
    fixture.detectChanges();
    const list = element.querySelector('[role="listbox"]')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(list.id);
    const options = list.querySelectorAll('[role="option"]');
    expect(options[0].getAttribute('aria-selected')).toBe('true');
    expect(options[2].querySelector('.hint')?.textContent?.trim()).toBe('38 este mes');
  });

  it('elegir con el mouse cambia el valor (two-way con signals) y cierra', () => {
    const { fixture, element, trigger } = setup(SignalHost);
    trigger.click();
    fixture.detectChanges();
    element.querySelectorAll<HTMLElement>('[role="option"]')[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.status()).toBe('in_stock');
    expect(element.querySelector('[role="listbox"]')).toBeNull();
    expect(trigger.textContent?.trim()).toBe('En stock');
  });

  it('con el teclado: flechas para recorrer, Enter para elegir', () => {
    const { fixture, trigger, key } = setup(SignalHost);
    key(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    key(trigger, 'ArrowDown');
    key(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-activedescendant')).toMatch(/-2$/);
    key(trigger, 'Enter');
    expect(fixture.componentInstance.status()).toBe('sold');
    expect(document.activeElement).toBe(trigger);
  });

  it('Escape cierra sin cambiar el valor', () => {
    const { fixture, element, trigger, key } = setup(SignalHost);
    key(trigger, 'Enter');
    key(trigger, 'ArrowDown');
    key(trigger, 'Escape');
    expect(element.querySelector('[role="listbox"]')).toBeNull();
    expect(fixture.componentInstance.status()).toBe('all');
  });

  it('con pocas opciones no hay buscador', () => {
    const { fixture, element, trigger } = setup(SignalHost);
    trigger.click();
    fixture.detectChanges();
    expect(element.querySelector('input[type="search"]')).toBeNull();
  });

  it('con formularios reactivos: toma el valor del control y lo actualiza', () => {
    const { fixture, element, trigger } = setup(FormHost);
    expect(trigger.textContent?.trim()).toBe('Calzado');
    trigger.click();
    fixture.detectChanges();
    element.querySelectorAll<HTMLElement>('[role="option"]')[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.category.value).toBe('Vestidos');
  });

  it('con más de 7 opciones suma un buscador que filtra sin importar tildes ni mayúsculas', () => {
    const { fixture, element, trigger, key } = setup(FormHost);
    trigger.click();
    fixture.detectChanges();
    const search = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'CAMPERA';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const options = element.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(1);
    key(search, 'Enter');
    expect(fixture.componentInstance.category.value).toBe('Camperas y abrigos');
  });

  it('si el filtro no encuentra nada, lo dice', () => {
    const { fixture, element, trigger } = setup(FormHost);
    trigger.click();
    fixture.detectChanges();
    const search = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'zapatillas';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelector('.empty')?.textContent?.trim()).toBe(
      'No encontramos opciones con “zapatillas”.',
    );
  });

  it('el control deshabilitado deshabilita el botón', () => {
    const { fixture, trigger } = setup(FormHost);
    fixture.componentInstance.category.disable();
    fixture.detectChanges();
    expect(trigger.disabled).toBe(true);
  });
});
