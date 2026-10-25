import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../fake-api';
import { renderRoute, setObservedWidth } from '../../render';

type Role = 'merchant' | 'consignor';

// Pantallas con su consulta principal: si falla, muestran el error y permiten reintentar.
const SCREENS: [string, Role, RegExp][] = [
  ['/c', 'consignor', /^\/garments$/],
  ['/c/payouts', 'consignor', /^\/payouts\/monthly$/],
  ['/c/notifications', 'consignor', /^\/notifications$/],
  ['/m', 'merchant', /^\/reports\/dashboard$/],
  ['/m/proposals', 'merchant', /^\/garments$/],
  ['/m/inventory', 'merchant', /^\/garments$/],
  ['/m/sales-points', 'merchant', /^\/sales-points$/],
  ['/m/payouts', 'merchant', /^\/payouts\/monthly$/],
  ['/m/consignors', 'merchant', /^\/reports\/consignors$/],
  ['/m/categories', 'merchant', /^\/categories$/],
  ['/m/settings', 'merchant', /^\/merchants\//],
  ['/m/notifications', 'merchant', /^\/notifications$/],
];

describe('Estados de error, vacíos y de celular', { timeout: 60000 }, () => {
  for (const [url, as, path] of SCREENS) {
    it(`${url}: error al cargar y reintento`, async () => {
      const api = new FakeApi();
      api.fail('GET', path, 500, 'caído', 1);
      const s = await renderRoute(url, as, api);
      expect(s.text()).toContain('No pudimos');
      await s.click('Reintentar');
      expect(s.text()).not.toContain('No pudimos cargar');
    });
  }

  it('sin datos: cada pantalla muestra su estado vacío', async () => {
    const api = new FakeApi();
    api.db.garments = [];
    api.db.agreements = [];
    api.db.proposals = [];
    api.db.notifications = { merchant: [], consignor: [] };
    api.db.payouts = {
      merchantMonthly: [],
      merchantFlat: [],
      consignorMonthly: [],
      consignorFlat: [],
    };
    api.db.reports['consignors'] = [];
    api.db.categories = api.db.categories.filter((c) => c['base']);
    api.db.reports['dashboard'] = {
      ...(api.db.reports['dashboard'] as object),
      pendingCount: 0,
      expiringCount: 0,
      awaitingPickupCount: 0,
      unclaimedPendingCount: 0,
      categories: [],
      weekly: [],
    };
    for (const [url, as] of SCREENS) {
      const s = await renderRoute(url, as, api);
      expect(s.text().length).toBeGreaterThan(20);
    }
  });

  it('versión de celular: barra inferior, filtros en hoja y seguimiento compacto', async () => {
    setObservedWidth(360);
    const api = new FakeApi();
    const garment = api.garment('in_stock');
    let s = await renderRoute(`/c/garment/${garment['id'] as string}`, 'consignor', api);
    const toggle = s
      .all<HTMLButtonElement>('button')
      .find((b) => /Ver recorrido|recorrido completo/i.test(b.textContent ?? ''));
    toggle?.click();
    await s.settle();
    s = await renderRoute('/m/reports', 'merchant', api);
    const filters = s
      .all<HTMLButtonElement>('button')
      .find((b) => /^Filtros/.test((b.textContent ?? '').trim()));
    filters?.click();
    await s.settle();
    s.all<HTMLButtonElement>('button')
      .find((b) => (b.textContent ?? '').includes('Limpiar'))
      ?.click();
    s.all<HTMLButtonElement>('button')
      .find((b) => (b.textContent ?? '').includes('Ver reportes'))
      ?.click();
    await s.settle();
    s = await renderRoute('/m/inventory', 'merchant', api);
    s.all<HTMLButtonElement>('app-filter-sheet button')[0]?.click();
    await s.settle();
    setObservedWidth(1024);
    expect(s.text()).toContain('Inventario');
  });
});
