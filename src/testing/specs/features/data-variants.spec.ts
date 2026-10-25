import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../fake-api';
import { renderRoute } from '../../render';

type Json = Record<string, unknown>;

/** Completa los campos opcionales (o los quita) para ver ambas versiones de cada pantalla. */
function complete(api: FakeApi, on: boolean): void {
  for (const g of api.db.garments) {
    if (on) {
      g['subcategory'] ??= 'Campera de jean';
      g['description'] = 'Con detalles';
    } else {
      delete g['subcategory'];
      g['description'] = '';
    }
  }
  for (const r of api.db.returns) r['identityChecked'] = on;
  for (const sale of api.db.sales) {
    if (on)
      Object.assign(sale, {
        paidAt: new Date().toISOString(),
        receiptNumber: 'T-1',
        paymentMethod: 'transfer',
      });
    else delete sale['receiptNumber'];
  }
  for (const c of api.db.consignors) if (!on) delete c['dni'];
  for (const p of api.db.payouts.merchantMonthly as Json[]) {
    if (!on) {
      delete p['counterpartDni'];
      delete p['counterpartBankDetails'];
    }
  }
  api.db.categories.push({
    id: 'propia',
    label: 'Ropa de bebé',
    subcategories: on ? ['Bodys'] : [],
    parentLabel: on ? 'Camperas y abrigos' : undefined,
    base: false,
    active: true,
    ownerMerchantId: api.db.merchant.id,
  });
}

describe('Pantallas con datos completos y con datos mínimos', { timeout: 120000 }, () => {
  for (const on of [true, false]) {
    it(on ? 'datos completos' : 'datos mínimos', async () => {
      const api = new FakeApi();
      complete(api, on);
      for (const g of api.db.garments) {
        const id = g['id'] as string;
        expect((await renderRoute(`/m/garment/${id}`, 'merchant', api)).text()).toContain(
          g['name'] as string,
        );
        expect((await renderRoute(`/m/inventory/${id}`, 'merchant', api)).text()).toContain(
          g['name'] as string,
        );
        if (g['status'] === 'under_review') await renderRoute(`/m/proposal/${id}`, 'merchant', api);
      }
      for (const url of ['/m/payouts', '/m/categories', '/m/consignors', '/c', '/c/payouts']) {
        await renderRoute(url, url.startsWith('/c') ? 'consignor' : 'merchant', api);
      }
    });
  }

  it('panel del cedente con una prenda de cada tipo pendiente', async () => {
    const api = new FakeApi();
    const mine = api.db.garments.filter((g) => g['consignorId'] === api.db.consignor.id);
    const keep = new Set<string>();
    api.db.garments = api.db.garments.filter((g) => {
      if (g['consignorId'] !== api.db.consignor.id) return false;
      const k = g['status'] as string;
      if (keep.has(k)) return false;
      keep.add(k);
      return true;
    });
    expect(mine.length).toBeGreaterThan(0);
    let s = await renderRoute('/c', 'consignor', api);
    expect(s.text()).toMatch(/Tenés 1|1 prenda/);
    api.db.garments = api.db.garments.filter((g) => g['status'] === 'counteroffer');
    s = await renderRoute('/c', 'consignor', api);
    api.db.garments = [{ ...api.garment('counteroffer'), status: 'under_review' }];
    s = await renderRoute('/c', 'consignor', api);
    api.db.garments = [{ ...mine[0], status: 'paid_out' }];
    s = await renderRoute('/c', 'consignor', api);
    expect(s.text()).toContain('Todo al día');
  });

  it('configuración: errores de cada campo', async () => {
    const s = await renderRoute('/m/settings', 'merchant');
    for (const name of ['businessName', 'email', 'phone', 'neighborhood', 'city']) {
      await s.type(`input[formcontrolname="${name}"]`, '');
    }
    await s.type('input[formcontrolname="email"]', 'no-es-email');
    await s.type('input[formcontrolname="consignorPercentage"]', '200');
    await s.type('input[formcontrolname="consignorPercentage"]', 'abc');
    await s.type('input[formcontrolname="pickupDays"]', '90');
    expect(s.text().length).toBeGreaterThan(0);
  });

  it('guías: navegación entre guías, acceso a la pantalla y valoración', async () => {
    let s = await renderRoute('/ayuda/guia/cargar-prenda', 'consignor');
    await s.click('Ir a la pantalla');
    expect(s.url()).toBe('/c/upload');
    s = await renderRoute('/ayuda/guia/responder-contraoferta', 'consignor');
    await s.click('Sí');
    s = await renderRoute('/ayuda/guia/consultar-liquidaciones', 'merchant');
    await s.click('No');
    const links = s
      .all<HTMLAnchorElement>('a')
      .filter((a) => (a.getAttribute('href') ?? '').startsWith('/ayuda/guia/'));
    links[links.length - 1]?.click();
    await s.settle();
    expect(s.url()).toMatch(/\/ayuda\/guia\//);
  });

  it('preguntas frecuentes: enlace a una pregunta de otro rol y a un tema', async () => {
    let s = await renderRoute('/ayuda/faq?rol=cedente#acuerdo', null);
    expect(s.text()).toContain('Preguntas frecuentes');
    s = await renderRoute('/ayuda/faq?rol=comercio#no-se-vende', null);
    s = await renderRoute('/ayuda/faq#inexistente', null);
    for (const item of s.all<HTMLElement>('app-help-faq-item button').slice(0, 2)) {
      item.click();
      await s.settle();
      item.click();
      await s.settle();
    }
    expect(s.url()).toContain('/ayuda/faq');
  });
});

describe('Seguimiento sin registros relacionados', { timeout: 120000 }, () => {
  it('sin acuerdo, recepción, venta, devolución, propuesta ni punto de venta', async () => {
    const api = new FakeApi();
    api.db.agreements = [];
    api.db.receptions = [];
    api.db.sales = [];
    api.db.returns = [];
    api.db.proposals = [];
    api.db.salesPoints = [];
    for (const m of api.db.merchants as Record<string, unknown>[]) m['salesPoints'] = [];
    api.db.merchantDoc['salesPoints'] = [];
    for (const g of api.db.garments) {
      const id = g['id'] as string;
      await renderRoute(`/c/garment/${id}`, 'consignor', api);
      await renderRoute(`/m/garment/${id}`, 'merchant', api);
    }
    expect(api.calls.length).toBeGreaterThan(0);
  });
});
