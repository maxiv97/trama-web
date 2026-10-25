import { beforeEach, describe, expect, it } from 'vitest';
import { FakeApi } from '../../../../fake-api';
import { renderRoute, Screen } from '../../../../render';

// Botones de exportación, ordenamientos y detalles de la pestaña visible.
async function exerciseCards(s: Screen): Promise<void> {
  for (const label of [
    'Tasa de venta',
    'Conversión',
    'Días a venta',
    'Ganancia',
    'Ver todos',
    'Ver menos',
  ]) {
    for (const button of s
      .all<HTMLButtonElement>('button')
      .filter((b) => (b.textContent ?? '').trim().startsWith(label))) {
      button.click();
      await s.settle();
    }
  }
  for (const button of s
    .all<HTMLButtonElement>('button')
    .filter((b) => /^(CSV|Excel|XLSX)$/i.test((b.textContent ?? '').trim()))) {
    button.click();
    await s.settle();
  }
  // Abre el detalle de una categoría o de un tramo de antigüedad y lo exporta.
  const drillable = s.all<HTMLElement>(
    'app-bar-rows button, app-conviene-card tbody tr, app-conviene-card tbody button',
  );
  if (drillable.length) {
    drillable[0].click();
    await s.settle();
    const csv = s
      .all<HTMLButtonElement>('app-drill-modal button')
      .find((b) => (b.textContent ?? '').includes('CSV'));
    csv?.click();
    await s.settle();
    s.all<HTMLButtonElement>('app-drill-modal button')
      .find(
        (b) => /Cerrar|×/.test(b.textContent ?? '') || b.getAttribute('aria-label') === 'Cerrar',
      )
      ?.click();
    await s.settle();
  }
}

describe('Reportes', { timeout: 30000 }, () => {
  beforeEach(() => {
    URL.createObjectURL = () => 'blob:reporte';
    URL.revokeObjectURL = () => undefined;
  });

  it('recorre las cuatro pestañas, sus tarjetas, exportaciones y detalles', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/reports', 'merchant', api);
    for (const tab of ['Pagos y plazos', 'Financiera', 'Stock y rotación', 'Cedentes']) {
      await s.click(tab, '[role="tab"]');
      expect(s.text()).toContain('¿');
      await exerciseCards(s);
    }
    await s.click('¿Cuántas prendas recibidas tuvieron observaciones?');
    expect(api.called('GET', '/reports/discrepancies').length).toBeGreaterThan(0);
  });

  it('el recorte por período y por punto de venta, categoría y cedente se mantiene entre pestañas', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/reports', 'merchant', api);
    await s.click('Mes pasado', '[role="radio"]');
    await s.click('Últimos 3 meses', '[role="radio"]');
    await s.choose('Punto de venta', 'Todos los puntos');
    await s.choose('Categoría', 'Todas las categorías');
    await s.choose('Cedente', 'Todos los cedentes');
    await s.choose('Punto de venta', '');
    await s.click('Financiera', '[role="tab"]');
    const last = api.calls.filter((c) => c.path.startsWith('/reports/')).pop();
    expect(last?.params['from']).toBeDefined();
    await s.click('Este mes', '[role="radio"]');
    await s.click('Todo', '[role="radio"]');
  });

  it('una tarjeta que falla ofrece reintentar', async () => {
    const api = new FakeApi();
    api.fail('GET', /^\/reports\/rotation$/, 500, 'caído', 1);
    const s = await renderRoute('/m/reports', 'merchant', api);
    await s.click('Stock y rotación', '[role="tab"]');
    expect(s.text()).toContain('No pudimos');
    await s.click('Reintentar');
  });

  it('sin datos muestra los estados vacíos', async () => {
    const api = new FakeApi();
    for (const key of ['expiring', 'byCategory', 'byPoint', 'consignors', 'discrepancyDetail'])
      api.db.reports[key] = [];
    api.db.reports['rotation'] = { stockAging: [], staleCount: 0, avgDaysToSale: null };
    api.db.reports['discrepancies'] = {
      totalReceptions: 0,
      withDiscrepancies: 0,
      rate: 0,
      byType: [],
    };
    api.db.payouts.merchantMonthly = [];
    const s = await renderRoute('/m/reports', 'merchant', api);
    for (const tab of ['Pagos y plazos', 'Financiera', 'Stock y rotación', 'Cedentes']) {
      await s.click(tab, '[role="tab"]');
    }
    expect(s.text()).toMatch(/No hay|Todavía|Sin /);
  });
});
