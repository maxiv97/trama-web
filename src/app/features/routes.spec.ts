import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../testing/fake-api';
import { renderRoute } from '../../testing/render';

// Cada pantalla de la app, navegando a su ruta real con la sesión del rol que corresponde.
describe('Rutas de la aplicación', () => {
  const pages: [string, 'merchant' | 'consignor' | null, string][] = [
    ['/', null, 'Consignación de indumentaria'],
    ['/login', null, 'Ingresá a Trama'],
    ['/register', null, '¿Cómo vas a usar Trama?'],
    ['/ayuda', null, '¿En qué te ayudamos?'],
    ['/ayuda/faq', null, 'Preguntas frecuentes'],
    ['/ayuda/contacto', null, 'Escribinos'],
    ['/ayuda/guia/retirar-prenda', null, 'Retirar una prenda que no se vendió'],
    ['/c', 'consignor', 'Mi panel'],
    ['/c/upload', 'consignor', 'Cargar prenda'],
    ['/c/payouts', 'consignor', 'Mis liquidaciones'],
    ['/c/notifications', 'consignor', 'Notificaciones'],
    ['/m', 'merchant', 'Qué hacer hoy'],
    ['/m/proposals', 'merchant', 'Propuestas'],
    ['/m/inventory', 'merchant', 'Inventario'],
    ['/m/sales-points', 'merchant', 'Puntos de venta'],
    ['/m/payouts', 'merchant', 'Liquidaciones'],
    ['/m/reports', 'merchant', 'Reportes'],
    ['/m/consignors', 'merchant', 'Mis cedentes'],
    ['/m/categories', 'merchant', 'Categorías'],
    ['/m/settings', 'merchant', 'Configuración'],
    ['/m/notifications', 'merchant', 'Notificaciones'],
  ];
  for (const [url, as, title] of pages) {
    it(`${url} muestra "${title}"`, async () => {
      const s = await renderRoute(url, as);
      expect(s.url()).toBe(url);
      expect(s.text()).toContain(title);
    });
  }

  it('las rutas privadas piden sesión y el rol correcto', async () => {
    expect((await renderRoute('/m', null)).url()).toBe('/login');
    expect((await renderRoute('/m/inventory', 'consignor')).url()).not.toContain('/m/');
    expect((await renderRoute('/m/compliance', 'merchant')).url()).toBe('/m/reports');
    expect((await renderRoute('/no-existe', null)).url()).toBe('/');
  });

  const statuses = [
    'submitted',
    'under_review',
    'counteroffer',
    'agreed',
    'rejected',
    'in_stock',
    'with_remarks',
    'sold',
    'paid_out',
    'no_agreement',
    'cancelled',
    'delivery_expired',
    'awaiting_pickup',
    'returned',
    'unclaimed',
  ];
  for (const status of statuses) {
    it(`seguimiento de una prenda ${status} (cedente y comercio)`, async () => {
      const api = new FakeApi();
      const garment = api.garment(status);
      const consignorView = await renderRoute(
        `/c/garment/${garment['id'] as string}`,
        'consignor',
        api,
      );
      expect(consignorView.text()).toContain(garment['name'] as string);
      const merchantView = await renderRoute(
        `/m/garment/${garment['id'] as string}`,
        'merchant',
        api,
      );
      expect(merchantView.text()).toContain(garment['name'] as string);
      const detail = await renderRoute(`/m/inventory/${garment['id'] as string}`, 'merchant', api);
      expect(detail.text()).toContain(garment['name'] as string);
    });
  }
});
