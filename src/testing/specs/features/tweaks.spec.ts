import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../fake-api';
import { renderRoute } from '../../render';

type Json = Record<string, unknown>;

describe('Variantes puntuales', { timeout: 60000 }, () => {
  it('carga de prenda: comercios sin verificar, sin horarios y cedente sin ubicación', async () => {
    const api = new FakeApi();
    const merchants = api.db.merchants as Json[];
    merchants[0]['verified'] = false;
    for (const sp of merchants[1]['salesPoints'] as Json[])
      (sp['receptionSchedule'] as Json)['days'] = '';
    merchants[2]['salesPoints'] = [];
    for (const c of api.db.consignors)
      if (c['id'] === api.db.consignor.id)
        c['location'] = { neighborhood: 'Centro', city: 'Córdoba' };
    for (const c of api.db.categories) c['subcategories'] = [];
    const s = await renderRoute('/c/upload', 'consignor', api);
    s.component<{ photos: { set(v: string[]): void } }>().photos.set(['data:a', 'data:b']);
    await s.click('Siguiente');
    s.all<HTMLButtonElement>('button[role="radio"]')[0].click();
    await s.settle();
    s.all<HTMLButtonElement>('button[role="radio"]')[1].click();
    await s.settle();
    s.all<HTMLButtonElement>('button[role="radio"]')[1].click();
    await s.settle();
    expect(s.text()).toContain('2 fotos');
  });

  it('propuestas e inventario filtrados por un cedente y un punto de venta', async () => {
    const api = new FakeApi();
    const consignor = (api.db.consignors.find((c) => c['id'] === api.db.consignor.id) as Json)[
      'name'
    ] as string;
    const point = api.db.salesPoints[0]['name'] as string;
    for (const url of ['/m/proposals', '/m/inventory']) {
      const s = await renderRoute(url, 'merchant', api);
      await s.choose('Cedente', consignor);
      await s.choose('Punto de venta', point);
      await s.type('input[type="search"]', 'a');
      expect(s.text()).toContain(url.includes('inventory') ? 'Inventario' : 'Propuestas');
    }
  });

  it('liquidaciones con una sola vencida y un solo cedente', async () => {
    const api = new FakeApi();
    const monthly = api.db.payouts.merchantMonthly as Json[];
    api.db.payouts.merchantMonthly = monthly.slice(0, 1).map((p) => ({ ...p, status: 'overdue' }));
    const s = await renderRoute('/m/payouts', 'merchant', api);
    expect(s.text()).toContain('1 liquidación vencida');
  });
});

describe('Más variantes puntuales', { timeout: 60000 }, () => {
  it('categorías: ocultar y volver a ofrecer una categoría base', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/categories', 'merchant', api);
    await s.click('Ofreciéndola');
    expect(s.text()).toContain('No la ofrezco');
    await s.click('No la ofrezco');
    expect(api.called('PATCH', '/categories/hidden')).toHaveLength(2);
    api.fail('POST', /^\/categories$/, 400, ['label must be shorter']);
    api.fail('POST', /^\/categories$/, 500, null);
    await s.click('Agregar categoría');
    await s.type('input[placeholder="Ej: Ropa de bebé"]', 'Algo');
    await s.click('Guardar');
    expect(s.text()).toContain('label must be shorter');
    await s.click('Guardar');
    expect(s.text()).toContain('No pudimos guardar la categoría');
  });

  it('venta de varias prendas sin errores', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/inventory', 'merchant', api);
    await s.click('En stock');
    const boxes = s.all<HTMLInputElement>('tbody input[type="checkbox"]');
    boxes[0].click();
    boxes[1].click();
    await s.settle();
    const ids = api.db.garments.filter((g) => g['status'] === 'in_stock').map((g) => g['id']);
    api.override('POST /sales/bulk', { sold: ids.slice(0, 2), failed: [] });
    await s.click('Marcar como vendidas');
    s.all<HTMLButtonElement>('button')
      .filter((b) => (b.textContent ?? '').includes('Marcar como vendidas'))
      .pop()
      ?.click();
    await s.settle();
    expect(s.toasts().join(' ')).toContain('2 prendas marcadas como vendidas');
  });

  it('panel con una sola urgencia y sin nombre comercial', async () => {
    const api = new FakeApi();
    Object.assign(api.db.reports['dashboard'] as Record<string, unknown>, {
      pendingCount: 1,
      expiringCount: 0,
      awaitingPickupCount: 0,
      unclaimedPendingCount: 0,
      displayName: '',
    });
    api.db.payouts.merchantMonthly = [];
    const s = await renderRoute('/m', 'merchant', api);
    expect(s.text()).toContain('Tenés 1 urgencia para hoy');
  });

  it('edición: mensajes del servidor en lista o sin cuerpo', async () => {
    const api = new FakeApi();
    const g = api.garment('under_review');
    api.fail('PATCH', /draft$/, 400, ['photos must not be empty']);
    api.fail('PATCH', /draft$/, 500, null);
    const s = await renderRoute(`/c/garment/${g['id'] as string}/edit`, 'consignor', api);
    await s.click('Guardar');
    expect(s.toasts()).toContain('photos must not be empty');
    await s.click('Guardar');
    expect(s.toasts()).toContain('No pudimos guardar los cambios.');
  });
});
