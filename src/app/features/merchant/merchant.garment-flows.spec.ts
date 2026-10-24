import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../../testing/fake-api';
import { renderRoute } from '../../../testing/render';

const id = (g: Record<string, unknown>) => g['id'] as string;

describe('Comercio · ciclo de una prenda', { timeout: 30000 }, () => {
  it('revisa una propuesta: contraoferta, aceptación y rechazo', async () => {
    const api = new FakeApi();
    const [a, b, c] = api.db.garments.filter((g) => g['status'] === 'under_review');
    let s = await renderRoute(`/m/proposal/${id(a)}`, 'merchant', api);
    await s.click('Contraofertar');
    await s.click('Cancelar');
    await s.click('Contraofertar');
    await s.type('input[type="number"]', '4000');
    expect(s.text()).toContain('Se vendería a');
    await s.click('Enviar contraoferta');
    expect(api.called('POST', `/proposals/${id(a)}/counteroffer`)[0].body).toEqual({
      consignorPrice: 4000,
    });

    s = await renderRoute(`/m/proposal/${id(b)}`, 'merchant', api);
    await s.click('Aceptar');
    await s.modal('confirm');
    expect(api.called('POST', `/proposals/${id(b)}/accept`)).toHaveLength(1);

    s = await renderRoute(`/m/proposal/${id(c)}`, 'merchant', api);
    await s.click('Rechazar');
    await s.modal('confirm');
    expect(api.called('POST', `/proposals/${id(c)}/reject`)).toHaveLength(1);
  });

  it('una propuesta que falla al aceptar avisa el error', async () => {
    const api = new FakeApi();
    const g = api.garment('under_review');
    api.fail('POST', /accept$/, 409, 'Transición inválida');
    const s = await renderRoute(`/m/proposal/${id(g)}`, 'merchant', api);
    await s.click('Aceptar');
    await s.modal('confirm');
    expect(s.toasts().join(' ')).toMatch(/Transición inválida|No pudimos/);
  });

  it('registra la recepción con observaciones y un rechazo', async () => {
    const api = new FakeApi();
    const [a, b] = api.db.garments.filter((g) => g['status'] === 'agreed');
    let s = await renderRoute(`/m/garment/${id(a)}/reception`, 'merchant', api);
    await s.click('Con observaciones');
    const checks = s.all<HTMLInputElement>('input[type="checkbox"]');
    checks[0].click();
    checks[1].click();
    checks[1].click();
    await s.settle();
    await s.type('textarea', 'Tiene una mancha en la manga');
    await s.choose('Punto de venta receptor', '');
    await s.click('Confirmar recepción');
    const body = api.called('POST', '/receptions')[0].body as Record<string, unknown>;
    expect(body).toMatchObject({ result: 'with_remarks', detail: 'Tiene una mancha en la manga' });

    s = await renderRoute(`/m/garment/${id(b)}/reception`, 'merchant', api);
    await s.click('Rechazar');
    await s.choose('Punto de venta receptor', '');
    s.all<HTMLInputElement>('input[type="checkbox"]')[0].click();
    await s.settle();
    expect((s.find('Confirmar recepción', 'button') as HTMLButtonElement).disabled).toBe(true);
    await s.type('textarea', 'No es la prenda acordada');
    await s.click('Confirmar recepción');
    expect(api.called('POST', '/receptions')).toHaveLength(2);
  });

  it('registra una venta con el reparto calculado', async () => {
    const api = new FakeApi();
    const g = api.garment('in_stock');
    const s = await renderRoute(`/m/garment/${id(g)}/sale`, 'merchant', api);
    await s.type('input[type="number"]', '25000');
    await s.type('input[type="date"]', '2026-10-20');
    await s.click('Registrar venta');
    await s.modal('confirm');
    expect(api.called('POST', '/sales')[0].body).toMatchObject({ actualSalePrice: 25000 });
  });

  it('registra la devolución con la verificación del DNI', async () => {
    const api = new FakeApi();
    const g = api.garment('awaiting_pickup');
    const s = await renderRoute(`/m/garment/${id(g)}/return`, 'merchant', api);
    expect((s.find('Registrar devolución', 'button') as HTMLButtonElement).disabled).toBe(true);
    s.all<HTMLInputElement>('input[type="checkbox"]')[0].click();
    await s.type('#return-notes', 'La retiró la hermana');
    await s.click('Registrar devolución', 'button');
    await s.modal('confirm');
    expect(api.called('POST', '/returns')[0].body).toMatchObject({
      identityChecked: true,
      notes: 'La retiró la hermana',
    });
  });

  it('registra el destino de una prenda no retirada', async () => {
    const api = new FakeApi();
    const g = api.db.garments.find(
      (x) => x['status'] === 'unclaimed' && !x['unclaimedDisposition'],
    )!;
    const s = await renderRoute(`/m/garment/${id(g)}`, 'merchant', api);
    await s.click('Otro destino');
    await s.type('#disposition-note', 'Reciclaje textil');
    await s.click('Registrar destino', 'button');
    await s.modal('confirm');
    expect(api.called('POST', `/garments/${id(g)}/disposition`)[0].body).toMatchObject({
      disposition: 'other',
      note: 'Reciclaje textil',
    });
  });

  it('marca pagada la liquidación de una prenda vendida', async () => {
    const api = new FakeApi();
    const g = api.garment('sold');
    const s = await renderRoute(`/m/garment/${id(g)}`, 'merchant', api);
    await s.click('Marcar liquidación pagada');
    await s.click('Efectivo');
    await s.click('Transferencia');
    await s.type('input[type="text"]', 'T-123');
    await s.click('Registrar pago');
    await s.modal('confirm');
    expect(api.called('POST', '/payouts/settle')[0].body).toMatchObject({
      paymentMethod: 'transfer',
    });
  });

  it('las pantallas de acciones muestran un error si la prenda no existe', async () => {
    const api = new FakeApi();
    for (const url of [
      '/m/garment/x',
      '/m/garment/x/reception',
      '/m/garment/x/sale',
      '/m/garment/x/return',
      '/m/proposal/x',
      '/m/inventory/x',
    ]) {
      const s = await renderRoute(url, 'merchant', api);
      expect(s.text()).toMatch(/No pudimos|Reintentar|no encontr/i);
    }
  });
});
