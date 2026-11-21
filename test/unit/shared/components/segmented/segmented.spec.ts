import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Segmented } from '../../../../../src/app/shared/components/segmented/segmented';

@Component({
  imports: [Segmented],
  template: `<app-segmented ariaLabel="Período" [options]="options" [(value)]="value" />`,
})
class Host {
  readonly options = [
    { value: 'all', label: 'Todo' },
    { value: 'this-month', label: 'Este mes' },
    { value: 'last-month', label: 'Mes pasado' },
  ];
  readonly value = signal('this-month');
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const options = () => Array.from(element.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  return { fixture, element, options };
}

describe('Segmented', () => {
  it('es un grupo de opciones excluyentes con su nombre', () => {
    const group = setup().element.querySelector('app-segmented')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Período');
  });

  it('marca la elegida y solo esa entra con Tab', () => {
    const { options } = setup();
    expect(options().map((option) => option.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(options().map((option) => option.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('un clic elige', () => {
    const { fixture, options } = setup();
    options()[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('last-month');
  });

  it('con las flechas elige la vecina y le pasa el foco', () => {
    const { fixture, options } = setup();
    options()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('all');
    expect(document.activeElement).toBe(options()[0]);
  });
});
