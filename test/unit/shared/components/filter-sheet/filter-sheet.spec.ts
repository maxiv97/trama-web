import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { FilterSheet } from '../../../../../src/app/shared/components/filter-sheet/filter-sheet';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

function screen(narrow: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: narrow,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

@Component({
  imports: [FilterSheet],
  template: `
    <app-filter-sheet
      noun="prendas"
      nounOne="prenda"
      [active]="active()"
      [results]="results()"
      (clear)="cleared = cleared + 1"
    >
      <ng-template let-inSheet>
        @if (inSheet) {
          <p class="label">Estado</p>
        }
        <span class="filter">chips</span>
      </ng-template>
    </app-filter-sheet>
  `,
})
class Host {
  readonly active = signal(2);
  readonly results = signal(5);
  cleared = 0;
}

function setup(narrow: boolean) {
  screen(narrow);
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...element.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  return { fixture, element, button };
}

describe('FilterSheet', () => {
  it('en pantalla ancha, los filtros se ven en fila y sin botón', () => {
    const { element, button } = setup(false);
    expect(element.querySelector('.filter')).not.toBeNull();
    expect(element.querySelector('.label')).toBeNull();
    expect(button('Filtros')).toBeUndefined();
  });

  it('en celular quedan detrás del botón, que dice cuántos hay activos', () => {
    const { element, button } = setup(true);
    expect(element.querySelector('dialog')?.open).toBe(false);
    expect(button('Filtros')?.querySelector('.count')?.textContent?.trim()).toBe('2 activos');
  });

  it('sin filtros activos, el botón no muestra contador y Limpiar no se puede usar', () => {
    const { fixture, element, button } = setup(true);
    fixture.componentInstance.active.set(0);
    fixture.detectChanges();
    expect(element.querySelector('.count')).toBeNull();
    expect(button('Limpiar')?.disabled).toBe(true);
  });

  it('el botón abre la hoja con los filtros y su nombre', () => {
    const { fixture, element, button } = setup(true);
    button('Filtros')!.click();
    fixture.detectChanges();
    const dialog = element.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('.label')?.textContent).toBe('Estado');
    expect(dialog.querySelector('.filter')).not.toBeNull();
  });

  it('el pie dice cuántos resultados quedan y cierra la hoja', () => {
    const { fixture, element, button } = setup(true);
    button('Filtros')!.click();
    fixture.detectChanges();
    const show = button('Ver 5 prendas')!;
    show.click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')?.open).toBe(false);
  });

  it('con un resultado, en singular; sin resultados, lo dice', () => {
    const { fixture, button } = setup(true);
    fixture.componentInstance.results.set(1);
    fixture.detectChanges();
    expect(button('Ver 1 prenda')).toBeDefined();
    fixture.componentInstance.results.set(0);
    fixture.detectChanges();
    expect(button('Sin resultados')).toBeDefined();
  });

  it('Limpiar avisa a la pantalla y deja la hoja abierta', () => {
    const { fixture, element, button } = setup(true);
    button('Filtros')!.click();
    fixture.detectChanges();
    button('Limpiar')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.cleared).toBe(1);
    expect(element.querySelector('dialog')?.open).toBe(true);
  });
});
