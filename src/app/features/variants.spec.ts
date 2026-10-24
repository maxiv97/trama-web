import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../testing/fake-api';
import { renderRoute, Screen } from '../../testing/render';

type Json = Record<string, unknown>;

/** Deja un solo ejemplo de cada estado para ver los textos en singular. */
function singular(api: FakeApi): void {
  const seen = new Set<unknown>();
  api.db.garments = api.db.garments.filter(
    (g) => !seen.has(g['status']) && !!seen.add(g['status']),
  );
}

const key = (target: Element, k: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

/** El buscador espera a que se deje de escribir antes de buscar. */
async function typeSearch(s: Screen, box: HTMLInputElement, text: string): Promise<void> {
  await s.type(box, text);
  await new Promise((resolve) => setTimeout(resolve, 300));
  await s.settle();
}

async function searchBox(s: Screen, text: string): Promise<HTMLInputElement> {
  const box = s.el.querySelector<HTMLInputElement>('app-help-search-box input')!;
  box.dispatchEvent(new Event('focus'));
  await typeSearch(s, box, text);
  return box;
}

describe('Variantes de datos y de interacción', { timeout: 60000 }, () => {
  it('inventario y propuestas con una prenda por estado y los filtros de la hoja (celular)', async () => {
    const api = new FakeApi();
    singular(api);
    let s = await renderRoute('/m/inventory', 'merchant', api);
    expect(s.text()).toContain('1 prenda no se vendió');
    s.all<HTMLButtonElement>('app-filter-sheet button')[0].click();
    await s.settle();
    await s.choose('Cedente', '', 1);
    await s.choose('Punto de venta', '', 1);
    await s.choose('Cedente', 'Todos', 1);
    await s.choose('Punto de venta', 'Todos', 1);
    for (const chip of s.all<HTMLButtonElement>('app-filter-chips button')) {
      chip.click();
      await s.settle();
    }
    await s.click('En stock');
    s.all<HTMLInputElement>('tbody input[type="checkbox"]')[0]?.click();
    await s.settle();
    expect(s.text()).toContain('1 prenda seleccionada');
    s.all<HTMLInputElement>('tbody input[type="checkbox"]')[0]?.click();
    await s.settle();
    s.all<HTMLInputElement>('tbody input[type="checkbox"]')[0]?.click();
    await s.settle();
    await s.click('Marcar como vendidas');
    s.all<HTMLButtonElement>('button')
      .filter((b) => (b.textContent ?? '').trim() === 'Cancelar')
      .pop()
      ?.click();
    await s.settle();
    await s.click('Cancelar');

    s = await renderRoute('/m/proposals', 'merchant', api);
    s.all<HTMLButtonElement>('app-filter-sheet button')[0].click();
    await s.settle();
    await s.choose('Cedente', '', 1);
    await s.choose('Punto de venta', '', 1);
    for (const chip of s.all<HTMLButtonElement>('app-filter-chips button')) {
      chip.click();
      await s.settle();
    }
    await s.type('input[type="search"]', 'zzz');
    expect(s.text()).toMatch(/No hay|No encontramos/);
  });

  it('panel: urgencias en singular, métricas nuevas, en baja y montos grandes', async () => {
    const api = new FakeApi();
    const dashboard = api.db.reports['dashboard'] as Json;
    Object.assign(dashboard, {
      pendingCount: 1,
      expiringCount: 1,
      awaitingPickupCount: 1,
      unclaimedPendingCount: 1,
    });
    const summary = dashboard['summary'] as { current: Json; previous: Json };
    summary.previous = {
      ...summary.current,
      profit: 0,
      revenue: (summary.current['revenue'] as number) * 2,
      soldCount: 99,
      avgTicket: 1,
    };
    summary.current = { ...summary.current, profit: 1_250_000 };
    api.db.payouts.merchantMonthly = api.db.payouts.merchantMonthly
      .slice(0, 1)
      .map((p) => ({ ...p, status: 'overdue' }));
    let s = await renderRoute('/m', 'merchant', api);
    expect(s.text()).toContain('1 propuesta para revisar');
    expect(s.text()).toContain('1 prenda no retirada');
    expect(s.text()).toContain('nuevo');
    for (const link of ['Ver', 'Registrar']) {
      await s.click(link).catch(() => undefined);
      await s.navigate('/m');
    }
    Object.assign(dashboard, {
      pendingCount: 0,
      expiringCount: 0,
      awaitingPickupCount: 0,
      unclaimedPendingCount: 0,
      categories: [],
      weekly: [],
      displayName: '',
    });
    api.db.payouts.merchantMonthly = [];
    s = await renderRoute('/m', 'merchant', api);
    expect(s.text()).toContain('Todo al día');
  });

  it('buscador del centro de ayuda: teclado, guías y preguntas, y modo en línea', async () => {
    let s = await renderRoute('/ayuda?rol=comercio', null);
    let box = await searchBox(s, 'devolución');
    key(box, 'ArrowDown');
    key(box, 'ArrowDown');
    key(box, 'ArrowUp');
    key(box, 'ArrowUp');
    key(box, 'ArrowUp');
    await s.settle();
    expect(s.text()).toMatch(/Pregunta|Guía/);
    key(box, 'ArrowDown');
    key(box, 'Enter');
    await s.settle();
    expect(s.url()).toMatch(/\/ayuda\/(guia|faq)/);

    s = await renderRoute('/ayuda', null);
    box = await searchBox(s, 'retirar');
    s.all<HTMLButtonElement>(
      'app-help-search-box li button, app-help-search-box [role="option"]',
    )[0]?.click();
    await s.settle();
    s = await renderRoute('/ayuda', null);
    box = await searchBox(s, 'cobro');
    key(box, 'Enter');
    await s.settle();
    key(box, 'Escape');
    await s.settle();

    s = await renderRoute('/ayuda/faq', null);
    box = s.el.querySelector<HTMLInputElement>('app-help-search-box input')!;
    await typeSearch(s, box, 'plazo');
    key(box, 'ArrowDown');
    key(box, 'Enter');
    await s.settle();
    await typeSearch(s, box, 'xyzzy');
    await s.type(box, '');
    s.el.querySelector<HTMLButtonElement>('button[aria-label="Borrar búsqueda"]')?.click();
    await s.settle();
  });

  it('seguimiento del cedente con datos parciales: sin punto de venta, sin recepción y plazos vencidos', async () => {
    const api = new FakeApi();
    api.db.salesPoints = [];
    api.db.receptions = [];
    for (const a of api.db.agreements) {
      a['deliveryDeadline'] = new Date(Date.now() - 3 * 86400000).toISOString();
      a['pickupDeadline'] = new Date(Date.now() - 86400000).toISOString();
      a['saleDeadline'] = new Date(Date.now() + 86400000).toISOString();
      delete a['pickupDays'];
    }
    for (const sale of api.db.sales) {
      sale['paidAt'] = new Date().toISOString();
      sale['receiptNumber'] = 'T-1';
      sale['paymentMethod'] = 'cash';
    }
    for (const status of [
      'agreed',
      'rejected',
      'in_stock',
      'awaiting_pickup',
      'returned',
      'unclaimed',
      'delivery_expired',
      'sold',
      'paid_out',
    ]) {
      const g = api.db.garments.find((x) => x['status'] === status)!;
      const s = await renderRoute(`/c/garment/${g['id'] as string}`, 'consignor', api);
      expect(s.text()).toContain(g['name'] as string);
      const m = await renderRoute(`/m/garment/${g['id'] as string}`, 'merchant', api);
      expect(m.text()).toContain(g['name'] as string);
    }
  });

  it('acciones del cedente que fallan en cada diálogo', async () => {
    const api = new FakeApi();
    api.fail('POST', /accept-counteroffer$/, 500, 'caído');
    api.fail('POST', /\/reject$/, 500, 'caído');
    api.fail('POST', /actions$/, 500, 'caído', 2);
    const counter = api.garment('counteroffer');
    let s = await renderRoute(`/c/garment/${counter['id'] as string}`, 'consignor', api);
    await s.click('Aceptar');
    await s.modal('confirm');
    await s.click('Rechazar');
    await s.modal('confirm');
    const rejected = api.garment('rejected');
    s = await renderRoute(`/c/garment/${rejected['id'] as string}`, 'consignor', api);
    await s.click('Coordinar nueva entrega');
    await s.modal('confirm');
    expect(s.toasts().length).toBeGreaterThan(0);
  });

  it('acciones del comercio que fallan: recepción, venta, devolución, destino y pago', async () => {
    const api = new FakeApi();
    for (const path of [
      /^\/receptions$/,
      /^\/sales$/,
      /^\/returns$/,
      /disposition$/,
      /^\/payouts\/settle$/,
      /counteroffer$/,
      /reject$/,
    ]) {
      api.fail('POST', path, 500, 'caído');
    }
    const agreed = api.garment('agreed');
    let s = await renderRoute(`/m/garment/${agreed['id'] as string}/reception`, 'merchant', api);
    await s.click('Conforme');
    await s.choose('Punto de venta receptor', '');
    await s.click('Confirmar recepción');
    const inStock = api.garment('in_stock');
    s = await renderRoute(`/m/garment/${inStock['id'] as string}/sale`, 'merchant', api);
    await s.click('Registrar venta');
    await s.modal('confirm');
    const pickup = api.garment('awaiting_pickup');
    s = await renderRoute(`/m/garment/${pickup['id'] as string}/return`, 'merchant', api);
    s.all<HTMLInputElement>('input[type="checkbox"]')[0].click();
    await s.settle();
    await s.click('Registrar devolución', 'button');
    await s.modal('confirm');
    const unclaimed = api.db.garments.find(
      (x) => x['status'] === 'unclaimed' && !x['unclaimedDisposition'],
    )!;
    s = await renderRoute(`/m/garment/${unclaimed['id'] as string}`, 'merchant', api);
    await s.click('Donada');
    await s.click('Registrar destino', 'button');
    await s.modal('confirm');
    const sold = api.garment('sold');
    s = await renderRoute(`/m/garment/${sold['id'] as string}`, 'merchant', api);
    await s.click('Marcar liquidación pagada');
    await s.click('Efectivo');
    await s.click('Registrar pago');
    await s.modal('confirm');
    const review = api.garment('under_review');
    s = await renderRoute(`/m/proposal/${review['id'] as string}`, 'merchant', api);
    await s.click('Contraofertar');
    await s.type('input[type="number"]', '0');
    await s.type('input[type="number"]', '3000');
    await s.click('Enviar contraoferta');
    await s.click('Cancelar');
    await s.click('Rechazar');
    await s.modal('confirm');
    expect(s.toasts().length).toBeGreaterThan(0);
  });
});
