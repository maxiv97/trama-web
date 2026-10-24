import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../../testing/fake-api';
import { renderRoute, savedPdfs } from '../../../testing/render';

const id = (g: Record<string, unknown>) => g['id'] as string;

describe('Cedente', { timeout: 30000 }, () => {
  it('carga una prenda en cuatro pasos y envía la propuesta', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/c/upload', 'consignor', api);
    await s.click('Siguiente');
    expect(s.text()).toMatch(/foto/i);
    s.component<{ photos: { set(v: string[]): void } }>().photos.set([
      'data:image/jpeg;base64,AAA',
    ]);
    await s.settle();
    await s.click('Siguiente');

    await s.click('Siguiente');
    expect(s.text()).toContain('Elegí un comercio para seguir');
    await s.type('input[type="search"]', 'zzzz');
    expect(s.text()).toContain('No encontramos comercios');
    await s.type('input[type="search"]', '');
    s.all<HTMLButtonElement>('button[role="radio"]')[0].click();
    await s.settle();
    await s.click('Siguiente');

    await s.click('Siguiente');
    expect(s.text()).toContain('obligatorio');
    await s.type('#g-name', 'Campera de jean');
    await s.choose('Categoría', 'Camperas y abrigos');
    await s.choose('Subcategoría', '');
    await s.type('#g-brand', 'Levis');
    await s.type('#g-size', 'M');
    await s.type('#g-color', 'Azul');
    await s.choose('Temporada', 'Invierno');
    await s.click('Muy bueno');
    await s.type('#g-desc', 'Poco uso');
    await s.click('Siguiente');

    await s.click('Enviar propuesta');
    await s.type('#g-price', '15000');
    expect(s.text()).toMatch(/\$\s?[\d.]+/);
    await s.click('Enviar propuesta');
    expect(api.called('POST', '/garments')).toHaveLength(1);
    expect(api.called('POST', '/proposals')[0].body).toMatchObject({
      requestedConsignorPrice: 15000,
    });
    await s.click('Ver seguimiento');
    expect(s.url()).toMatch(/^\/c\/garment\//);
  });

  it('si falla el envío avisa y deja reintentar; luego carga otra prenda', async () => {
    const api = new FakeApi();
    api.fail('POST', /^\/garments$/, 500, 'caído');
    const s = await renderRoute('/c/upload', 'consignor', api);
    const page = s.component<{ photos: { set(v: string[]): void } }>();
    page.photos.set(['data:image/jpeg;base64,AAA']);
    await s.settle();
    await s.click('Siguiente');
    s.all<HTMLButtonElement>('button[role="radio"]')[0].click();
    await s.settle();
    await s.click('Siguiente');
    await s.type('#g-name', 'Remera');
    await s.choose('Categoría', 'Remeras');
    await s.choose('Subcategoría', '');
    await s.type('#g-brand', 'Zara');
    await s.type('#g-size', 'S');
    await s.type('#g-color', 'Blanco');
    await s.choose('Temporada', 'Verano');
    await s.click('Bueno');
    await s.click('Siguiente');
    await s.type('#g-price', '5000');
    await s.click('Enviar propuesta');
    expect(s.toasts().join(' ') + s.text()).toMatch(/caído|No pudimos/);
    await s.click('Enviar propuesta');
    await s.click('Cargar otra prenda');
    expect(s.text()).toContain('Paso 1 de 4');
    await s.click('Anterior').catch(() => undefined);
  });

  it('responde una contraoferta: rechaza y acepta', async () => {
    const api = new FakeApi();
    const garment = api.garment('counteroffer');
    let s = await renderRoute(`/c/garment/${id(garment)}`, 'consignor', api);
    await s.click('Rechazar');
    await s.modal('cancel');
    await s.click('Rechazar');
    await s.modal('confirm');
    expect(api.called('POST', `/proposals/${id(garment)}/reject`)).toHaveLength(1);

    const other = api.db.garments.filter((g) => g['status'] === 'counteroffer')[1];
    s = await renderRoute(`/c/garment/${id(other)}`, 'consignor', api);
    await s.click('Aceptar');
    await s.modal('confirm');
    expect(api.called('POST', `/proposals/${id(other)}/accept-counteroffer`)).toHaveLength(1);
  });

  it('cancela una prenda acordada y coordina una nueva entrega tras un rechazo', async () => {
    const api = new FakeApi();
    const agreed = api.garment('agreed');
    let s = await renderRoute(`/c/garment/${id(agreed)}`, 'consignor', api);
    await s.click('Cancelar prenda');
    await s.modal('confirm');
    expect(api.called('POST', `/garments/${id(agreed)}/actions`)[0].body).toMatchObject({
      action: 'CANCEL',
    });

    const rejected = api.garment('rejected');
    s = await renderRoute(`/c/garment/${id(rejected)}`, 'consignor', api);
    await s.click('Coordinar nueva entrega');
    await s.modal('confirm');
    expect(api.called('POST', `/garments/${id(rejected)}/actions`)[0].body).toMatchObject({
      action: 'REDELIVER',
    });
  });

  it('una acción que falla muestra el error', async () => {
    const api = new FakeApi();
    const agreed = api.garment('agreed');
    api.fail('POST', /actions$/, 409, 'Transición inválida');
    const s = await renderRoute(`/c/garment/${id(agreed)}`, 'consignor', api);
    await s.click('Cancelar prenda');
    await s.modal('confirm');
    expect(s.toasts().join(' ')).toMatch(/Transición inválida|No pudimos/);
  });

  it('edita una consignación en revisión', async () => {
    const api = new FakeApi();
    const garment = api.garment('under_review');
    const s = await renderRoute(`/c/garment/${id(garment)}/edit`, 'consignor', api);
    expect(s.text()).toContain(garment['name'] as string);
    await s.type('#e-name', 'Nombre nuevo').catch(async () => {
      const first = s.all<HTMLInputElement>('input.t-input')[0];
      await s.type(first, 'Nombre nuevo');
    });
    await s.click('Guardar');
    expect(api.called('PATCH', `/garments/${id(garment)}/draft`)).toHaveLength(1);
  });

  it('una prenda que no es del cedente o no existe muestra el error', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/c/garment/no-existe', 'consignor', api);
    expect(s.text()).toMatch(/No pudimos|no encontr|Reintentar/i);
  });

  it('liquidaciones: descarga el detalle', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/c/payouts', 'consignor', api);
    const created: string[] = [];
    URL.createObjectURL = () => {
      created.push('blob');
      return 'blob:pdf';
    };
    URL.revokeObjectURL = () => undefined;
    await s.click('Descargar');
    expect(savedPdfs.some((name) => name.startsWith('liquidacion-'))).toBe(true);
    expect(s.text()).toContain('Mis liquidaciones');
  });

  it('notificaciones: marca todas como leídas y abre una', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/c/notifications', 'consignor', api);
    await s.click('Marcar todas como leídas');
    expect(api.called('PATCH', '/notifications/read-all')).toHaveLength(1);
    const item = s.all<HTMLElement>('app-notification-list button, app-notification-list a')[0];
    item.click();
    await s.settle();
    expect(s.url()).not.toBe('/c/notifications');
  });
});
