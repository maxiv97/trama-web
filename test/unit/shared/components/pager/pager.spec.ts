import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Pager } from '../../../../../src/app/shared/components/pager/pager';

@Component({
  imports: [Pager],
  template: `<app-pager noun="prendas" [total]="total()" [pageSize]="10" [(page)]="page" />`,
})
class Host {
  total = signal(95);
  page = signal(1);
}

function setup(total = 95, page = 1) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.total.set(total);
  fixture.componentInstance.page.set(page);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const labels = () =>
    Array.from(element.querySelectorAll('nav > button:not(.step), nav > .gap')).map((node) =>
      node.textContent?.trim(),
    );
  return { fixture, element, labels };
}

describe('Pager', () => {
  it('dice cuántos se ven de cuántos hay', () => {
    expect(setup().element.querySelector('.summary')?.textContent?.trim()).toBe(
      'Mostrando 10 de 95 prendas',
    );
  });

  it('la última página puede venir incompleta', () => {
    expect(setup(95, 10).element.querySelector('.summary')?.textContent?.trim()).toBe(
      'Mostrando 5 de 95 prendas',
    );
  });

  it('con una sola página no hay paginación', () => {
    expect(setup(8).element.querySelector('nav')).toBeNull();
  });

  it('con muchas páginas: la primera, la última y las vecinas de la actual', () => {
    expect(setup(95, 1).labels()).toEqual(['1', '2', '…', '10']);
    expect(setup(95, 5).labels()).toEqual(['1', '…', '4', '5', '6', '…', '10']);
  });

  it('la actual está marcada y elegir otra cambia la página', () => {
    const { fixture, element } = setup(95, 5);
    expect(element.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('5');
    element.querySelector<HTMLButtonElement>('[aria-label="Página 6"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(6);
  });

  it('anterior y siguiente se apagan en las puntas', () => {
    const first = setup(95, 1).element;
    expect(first.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!.disabled).toBe(
      true,
    );
    const last = setup(95, 10).element;
    expect(last.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.disabled).toBe(
      true,
    );
  });

  it('siguiente avanza una página', () => {
    const { fixture, element } = setup(95, 2);
    element.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(3);
  });
});
