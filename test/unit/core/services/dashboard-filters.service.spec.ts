import { describe, expect, it } from 'vitest';
import { DashboardFiltersService } from '../../../../src/app/core/services/dashboard-filters.service';

describe('DashboardFiltersService', () => {
  it('empieza sin ningún filtro activo', () => {
    const filters = new DashboardFiltersService();
    expect(filters.hasAny()).toBe(false);
    expect(filters.current()).toEqual({
      from: undefined,
      to: undefined,
      salesPointId: undefined,
      category: undefined,
      consignorId: undefined,
    });
  });

  it('refleja el período y las dimensiones en el recorte', () => {
    const filters = new DashboardFiltersService();
    filters.setPeriod('2026-06-01', '2026-06-30');
    filters.setCategory('Calzado');
    filters.setSalesPoint('sp-1');
    filters.setConsignor('con-1');

    expect(filters.hasAny()).toBe(true);
    expect(filters.current()).toEqual({
      from: '2026-06-01',
      to: '2026-06-30',
      salesPointId: 'sp-1',
      category: 'Calzado',
      consignorId: 'con-1',
    });
  });

  it('limpia todo el recorte', () => {
    const filters = new DashboardFiltersService();
    filters.setCategory('Vestidos');
    filters.setPeriod('2026-01-01', '2026-12-31');
    filters.clear();

    expect(filters.hasAny()).toBe(false);
    expect(filters.category()).toBeUndefined();
    expect(filters.from()).toBeUndefined();
  });

  it('ignora un período vacío al contar filtros activos', () => {
    const filters = new DashboardFiltersService();
    filters.setPeriod(undefined, undefined);
    expect(filters.hasAny()).toBe(false);
  });
});
