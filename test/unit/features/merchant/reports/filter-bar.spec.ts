import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../../src/app/core/auth/auth.service';
import { DashboardFilterOptionsService } from '../../../../../src/app/core/services/dashboard-filter-options.service';
import { DashboardFiltersService } from '../../../../../src/app/core/services/dashboard-filters.service';
import { ReportsFilterBar } from '../../../../../src/app/features/merchant/reports/filter-bar/filter-bar';

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

function setup(narrow = false) {
  screen(narrow);
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { user: () => ({ id: 'm1' }) } },
      {
        provide: DashboardFilterOptionsService,
        useValue: {
          categories: () => of([{ value: 'Camperas', label: 'Camperas' }]),
          salesPoints: () => of([{ value: 'sp1', label: 'Palermo' }]),
          consignors: () => of([{ value: 'c1', label: 'Lucía Fernández' }]),
        },
      },
    ],
  });
  const filters = TestBed.inject(DashboardFiltersService);
  const fixture = TestBed.createComponent(ReportsFilterBar);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find((b) => b.textContent?.includes(text));
  return { fixture, element, filters, button };
}

describe('ReportsFilterBar', () => {
  it('en pantalla ancha, el período es un segmentado con Todo el período elegido', () => {
    const { element } = setup();
    const period = element.querySelector('app-segmented')!;
    expect(period.getAttribute('aria-label')).toBe('Período');
    expect(period.querySelector('[aria-checked="true"]')?.textContent?.trim()).toBe(
      'Todo el período',
    );
  });

  it('elegir un período guarda su rango en el recorte', () => {
    const { fixture, element, filters } = setup();
    const thisMonth = Array.from(
      element.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
    ).find((option) => option.textContent?.includes('Este mes'))!;
    thisMonth.click();
    fixture.detectChanges();
    expect(filters.from()).toMatch(/^\d{4}-\d{2}-01$/);
    expect(filters.to()).toBeDefined();
  });

  it('muestra el período que sigue aplicado al volver a la pantalla', () => {
    const { fixture, element, filters } = setup();
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    filters.setPeriod(iso(first), iso(last));
    fixture.detectChanges();
    expect(element.querySelector('[aria-checked="true"]')?.textContent?.trim()).toBe('Mes pasado');
  });

  it('en pantalla ancha, punto de venta, categoría y cedente van en la barra', () => {
    const { element, button } = setup();
    const labels = Array.from(element.querySelectorAll('app-dropdown')).map((dropdown) =>
      dropdown.querySelector('[aria-label]')?.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['Punto de venta', 'Categoría', 'Cedente']);
    expect(button('Filtros')).toBeUndefined();
  });

  it('sin filtrar, cada uno muestra la opción "todos"', () => {
    const texts = Array.from(setup().element.querySelectorAll('app-dropdown .current')).map(
      (node) => node.textContent?.trim(),
    );
    expect(texts).toEqual(['Todos los puntos', 'Todas las categorías', 'Todos los cedentes']);
  });

  it('"Limpiar filtros" aparece con algo aplicado y deja todo como al principio', () => {
    const { fixture, filters, button } = setup();
    expect(button('Limpiar filtros')).toBeUndefined();
    filters.setSalesPoint('sp1');
    filters.setPeriod('2026-01-01', '2026-01-31');
    fixture.detectChanges();
    button('Limpiar filtros')!.click();
    expect(filters.hasAny()).toBe(false);
  });

  it('en celular, el período es un dropdown y el resto queda detrás de "Filtros"', () => {
    const { element, button } = setup(true);
    const dropdowns = Array.from(element.querySelectorAll('app-dropdown'));
    const outside = dropdowns.filter((dropdown) => !dropdown.closest('dialog'));
    expect(element.querySelector('app-segmented')).toBeNull();
    expect(outside.map((d) => d.querySelector('[aria-label]')?.getAttribute('aria-label'))).toEqual(
      ['Período'],
    );
    // Los otros tres esperan en la hoja (cerrada)
    expect(dropdowns.length - outside.length).toBe(3);
    expect(button('Filtros')).toBeDefined();
  });

  it('en celular, el botón cuenta los filtros de la hoja, sin el período', () => {
    const { fixture, filters, button } = setup(true);
    filters.setPeriod('2026-01-01', '2026-01-31');
    filters.setCategory('Camperas');
    filters.setConsignor('c1');
    fixture.detectChanges();
    expect(button('Filtros')?.querySelector('.count')?.textContent?.trim()).toBe('2 activos');
  });
});
