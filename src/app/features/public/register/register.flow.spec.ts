import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../../../testing/fake-api';
import { renderRoute, Screen } from '../../../../testing/render';

async function fill(s: Screen, values: Record<string, string>): Promise<void> {
  for (const [id, value] of Object.entries(values)) await s.type(`#${id}`, value);
}

async function next(s: Screen): Promise<void> {
  await s.click('Siguiente');
}

describe('Registro', { timeout: 30000 }, () => {
  it('cedente: valida cada paso, crea la cuenta y verifica el email', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/register', null, api);
    await s.click('Registrarme como cedente');
    expect(s.text()).toContain('Tus datos de contacto');

    await next(s);
    expect(s.text()).toContain('Este campo es obligatorio');
    await fill(s, {
      'r-first': 'Camila',
      'r-last': 'Suárez',
      'r-email': 'camila@test.com',
      'r-phone': '351 555 1234',
      'r-pass': 'secreto123',
      'r-pass2': 'otra-clave',
    });
    expect(s.text()).toContain('no coinciden');
    await fill(s, { 'r-pass2': 'secreto123' });
    await next(s);

    await fill(s, { 'r-dni': '12' });
    await next(s);
    expect(s.text()).toContain('Verificación de identidad');
    await fill(s, { 'r-dni': '30111001', 'r-bank': 'camila.mp' });
    await next(s);

    await fill(s, {
      'r-street': 'Independencia',
      'r-num': '742',
      'r-unit': '3B',
      'r-hood': 'Nueva Córdoba',
      'r-city': 'Córdoba',
    });
    await next(s);

    await s.click('Crear cuenta');
    expect(s.text()).toMatch(/aceptar|Aceptá/i);
    const check = s.all<HTMLInputElement>('input[type="checkbox"]')[0];
    check.checked = true;
    check.dispatchEvent(new Event('change'));
    await s.settle();
    await s.click('Crear cuenta');
    expect(api.called('POST', '/auth/register/consignor')).toHaveLength(1);
    const body = api.called('POST', '/auth/register/consignor')[0].body as Record<string, unknown>;
    expect(body).toMatchObject({
      firstName: 'Camila',
      lastName: 'Suárez',
      dni: '30111001',
      bankDetails: 'camila.mp',
    });

    const code = s.el.querySelector<HTMLInputElement>('input[placeholder="123456"]')!;
    await s.type(code, '000000');
    await s.click('Verificar');
    expect(s.text()).toContain('El código no coincide');
    await s.click('Reenviar');
    expect(api.called('POST', '/auth/resend-code')).toHaveLength(1);
    await s.type(code, '12a3456');
    await s.click('Verificar');
    expect(s.text()).toContain('Tu cuenta de cedente está lista');
  });

  it('comercio: punto de venta, comisión y condiciones', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/register?rol=comercio', null, api);
    expect(s.text()).toContain('Datos de quien administra');
    await fill(s, {
      'r-name': 'Laura Comercio',
      'r-email': 'laura@test.com',
      'r-phone': '351',
      'r-pass': 'secreto123',
      'r-pass2': 'secreto123',
    });
    await next(s);
    await fill(s, { 'r-biz': 'Percha', 'r-cuit': '123' });
    await next(s);
    expect(s.text()).toContain('11');
    await fill(s, { 'r-cuit': '30712345678', 'r-bhood': 'Güemes', 'r-bcity': 'Córdoba' });
    await next(s);

    await fill(s, {
      'r-spname': 'Local Güemes',
      'r-spphone': '351 444',
      'r-spaddr': 'Belgrano 800',
      'r-spins': 'Timbre B',
    });
    for (const day of s.all<HTMLButtonElement>('button.day')) {
      if (day.getAttribute('aria-pressed') === 'true') day.click();
    }
    await s.settle();
    await next(s);
    expect(s.text()).toContain('Elegí al menos un día de atención');
    s.all<HTMLButtonElement>('button.day')[0].click();
    await s.settle();
    await next(s);

    expect(s.text()).toContain('Tu comisión');
    await s.type('#r-pct', '80');
    expect(s.text()).toContain('entre 40 % y 95 %');
    await next(s);
    await s.type('#r-pct', '35');
    expect(s.text()).toContain('Cedente 65 %');
    await next(s);

    await fill(s, { 'r-delivery': '40' });
    await next(s);
    await fill(s, { 'r-delivery': '5', 'r-pickup': '20', 'r-window': '4' });
    await s.click('15', 'button');
    await next(s);

    s.all<HTMLInputElement>('input[type="checkbox"]')[0].click();
    await s.settle();
    await s.click('Crear cuenta');
    const body = api.called('POST', '/auth/register/merchant')[0].body as Record<
      string,
      Record<string, unknown>
    >;
    expect(body['terms']).toMatchObject({
      deliveryDays: 5,
      pickupDays: 20,
      saleWindowMonths: 4,
      payoutDay: 15,
    });
    expect(body['commissionConfig']).toMatchObject({
      consignorPercentage: 65,
      merchantPercentage: 35,
    });
    await s.click('Verificar más tarde');
    expect(s.text()).toContain('Tu comercio ya puede recibir consignaciones');
  });

  it('muestra el error del servidor y permite volver a los pasos anteriores', async () => {
    const api = new FakeApi();
    api.fail('POST', /register\/consignor/, 409, 'duplicado');
    const s = await renderRoute('/register?rol=cedente', null, api);
    await fill(s, {
      'r-first': 'A',
      'r-last': 'B',
      'r-email': 'a@b.com',
      'r-phone': '1',
      'r-pass': 'secreto123',
      'r-pass2': 'secreto123',
    });
    await next(s);
    await fill(s, { 'r-dni': '30111001', 'r-bank': 'a.mp' });
    await next(s);
    await s.click('Anterior');
    expect(s.text()).toContain('Verificación de identidad');
    await s.click('Anterior');
    await s.click('Cambiar de rol');
    expect(s.text()).toContain('¿Cómo vas a usar Trama?');
    await s.click('Registrarme como cedente');
    await fill(s, {
      'r-first': 'A',
      'r-last': 'B',
      'r-email': 'a@b.com',
      'r-phone': '1',
      'r-pass': 'secreto123',
      'r-pass2': 'secreto123',
    });
    await next(s);
    await fill(s, { 'r-dni': '30111001', 'r-bank': 'a.mp' });
    await next(s);
    await fill(s, { 'r-street': 'X', 'r-num': '1', 'r-hood': 'Y', 'r-city': 'Z' });
    await next(s);
    s.all<HTMLInputElement>('input[type="checkbox"]')[0].click();
    await s.settle();
    await s.click('Crear cuenta');
    expect(s.text()).toContain('Ese email ya está registrado');
  });
});
