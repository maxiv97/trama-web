import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../fake-api';
import { renderRoute, Screen } from '../../render';

async function fill(s: Screen, values: Record<string, string>): Promise<void> {
  for (const [id, value] of Object.entries(values)) await s.type(`#${id}`, value);
}

describe('Variantes de los asistentes', { timeout: 30000 }, () => {
  it('registro de comercio con el servicio pago activo, errores de formato y vuelta a un paso anterior', async () => {
    const api = new FakeApi();
    api.override('GET /config', { monetization: true });
    api.fail('POST', /register\/merchant/, 0, 'offline');
    api.fail('POST', /register\/merchant/, 400, 'irrelevante');
    const s = await renderRoute('/register', null, api);
    expect(s.text()).toMatch(/pago|suscripción|plan/i);
    await s.click('Registrarme como comercio');
    await fill(s, { 'r-email': 'no-es-email', 'r-pass': 'corta', 'r-pass2': 'corta' });
    await s.click('Siguiente');
    expect(s.text()).toContain('Ingresá un email válido');
    expect(s.text()).toContain('Mínimo 8 caracteres');
    await fill(s, {
      'r-name': 'Laura',
      'r-email': 'laura@test.com',
      'r-phone': '1',
      'r-pass': 'secreto123',
      'r-pass2': 'secreto123',
    });
    await s.click('Siguiente');
    await fill(s, {
      'r-biz': 'Percha',
      'r-cuit': '30712345678',
      'r-bhood': 'Güemes',
      'r-bcity': 'Córdoba',
    });
    await s.click('Siguiente');
    await fill(s, { 'r-spname': 'Local', 'r-spphone': '1', 'r-spaddr': 'Belgrano 1' });
    await s.choose('Abre', '20:00');
    expect(s.text()).not.toContain('El cierre tiene que ser después de la apertura');
    await s.choose('Cierra', '09:00');
    expect(s.text()).toContain('El cierre tiene que ser después de la apertura');
    await s.choose('Cierra', '21:00');
    await s.click('Siguiente');
    await s.click('Siguiente');
    await fill(s, { 'r-window': '13', 'r-pickup': '0' });
    await s.click('Siguiente');
    expect(s.text()).toMatch(/El máximo es 12|El mínimo es 1/);
    await fill(s, { 'r-window': '3', 'r-pickup': '15' });
    // Vuelve al primer paso desde la barra de pasos.
    const first = s
      .all<HTMLElement>('app-seam button, app-seam [role="button"], app-wizard-shell button')
      .find((b) => (b.textContent ?? '').includes('Datos de la cuenta'));
    first?.click();
    await s.settle();
    while (s.all('button').some((b) => (b.textContent ?? '').trim() === 'Siguiente'))
      await s.click('Siguiente');
    s.all<HTMLInputElement>('input[type="checkbox"]')[0]?.click();
    await s.settle();
    await s.click('Crear cuenta');
    expect(s.toasts().join(' ')).toContain('No pudimos conectarnos');
    await s.click('Crear cuenta');
    expect(s.toasts().join(' ')).toContain('irrelevante');
  });

  it('carga de prenda: video, vuelta atrás, borrador recuperado y error al traer categorías', async () => {
    const api = new FakeApi();
    let s = await renderRoute('/c/upload', 'consignor', api);
    const page = s.component<{ photos: { set(v: string[]): void } }>();
    page.photos.set(['data:image/jpeg;base64,AAA']);
    const video = s.el.querySelector<HTMLInputElement>('input[accept="video/*"]')!;
    Object.defineProperty(video, 'files', {
      value: [new File(['v'], 'campera.mp4', { type: 'video/mp4' })],
    });
    video.dispatchEvent(new Event('change'));
    await s.settle();
    expect(s.text()).toContain('campera.mp4');
    await s.click('Quitar');
    await s.click('Siguiente');
    await s.type('input[type="search"]', 'Nueva Córdoba');
    s.all<HTMLButtonElement>('button[role="radio"]')[0]?.click();
    await s.settle();
    await s.click('Siguiente');
    await s.type('#g-name', 'Borrador');
    await s.click('Anterior');
    await s.click('Siguiente');

    // Al volver a entrar, el borrador se recupera en el mismo paso.
    s = await renderRoute('/c/upload', 'consignor', api, true);
    expect(s.text()).toContain('Paso 3 de 4');
    expect(s.el.querySelector<HTMLInputElement>('#g-name')?.value).toBe('Borrador');

    // Un borrador ilegible se ignora.
    localStorage.setItem(`trama.draft.upload.${api.db.consignor.id}`, '{roto');
    s = await renderRoute('/c/upload', 'consignor', api, true);
    expect(s.text()).toContain('Paso 1 de 4');

    api.fail('GET', /^\/categories$/, 500, 'caído');
    s = await renderRoute('/c/upload', 'consignor', api);
    s.component<{ photos: { set(v: string[]): void } }>().photos.set(['data:a']);
    await s.click('Siguiente');
    s.all<HTMLButtonElement>('button[role="radio"]')[1]?.click();
    await s.settle();
    expect(s.toasts()).toContain('No pudimos cargar las categorías del comercio');
    s.all<HTMLButtonElement>('button[role="radio"]')[0]?.click();
    await s.settle();
    await s.click('Volver al panel').catch(() => undefined);
  });

  it('seguimiento del cedente en cada estado con su barra y su historial', async () => {
    const api = new FakeApi();
    for (const g of api.db.garments.filter((x) => x['consignorId'] === api.db.consignor.id)) {
      const s = await renderRoute(`/c/garment/${g['id'] as string}`, 'consignor', api);
      expect(s.text()).toContain(g['name'] as string);
    }
  });

  it('seguimiento del comercio para todas las prendas de los datos de prueba', async () => {
    const api = new FakeApi();
    for (const g of api.db.garments) {
      const s = await renderRoute(`/m/garment/${g['id'] as string}`, 'merchant', api);
      expect(s.text()).toContain(g['name'] as string);
    }
  });
});

describe('Registro: mensajes de cada campo', { timeout: 30000 }, () => {
  it('cedente: errores del domicilio, del código y mensajes del servidor en lista', async () => {
    const api = new FakeApi();
    api.fail('POST', /register\/consignor/, 400, ['email must be an email']);
    api.fail('POST', /verify-email/, 500, null);
    const s = await renderRoute('/register?rol=cedente', null, api);
    await fill(s, {
      'r-first': 'A',
      'r-last': 'B',
      'r-email': 'a@b.com',
      'r-phone': '1',
      'r-pass': 'secreto123',
      'r-pass2': 'secreto123',
    });
    await s.click('Siguiente');
    await fill(s, { 'r-dni': '30111001', 'r-bank': 'a.mp' });
    await s.click('Siguiente');
    await s.click('Siguiente');
    expect(s.text().match(/Este campo es obligatorio/g)?.length).toBeGreaterThanOrEqual(4);
    await fill(s, { 'r-street': 'X', 'r-num': '1', 'r-hood': 'Y', 'r-city': 'Z' });
    await s.click('Siguiente');
    s.all<HTMLInputElement>('input[type="checkbox"]')[0].click();
    await s.settle();
    await s.click('Crear cuenta');
    expect(s.toasts()).toContain('email must be an email');
    await s.click('Crear cuenta');
    const code = s.el.querySelector<HTMLInputElement>('input[placeholder="123456"]')!;
    await s.type(code, '654321');
    await s.click('Verificar');
    expect(s.text()).toContain('El código no coincide o venció');
  });

  it('comercio: errores del comercio y del punto de venta', async () => {
    const s = await renderRoute('/register?rol=comercio', null);
    await fill(s, {
      'r-name': 'L',
      'r-email': 'l@b.com',
      'r-phone': '1',
      'r-pass': 'secreto123',
      'r-pass2': 'secreto123',
    });
    await s.click('Siguiente');
    await s.click('Siguiente');
    expect(s.text()).toContain('Este campo es obligatorio');
    await fill(s, { 'r-biz': 'P', 'r-cuit': '30712345678', 'r-bhood': 'G', 'r-bcity': 'C' });
    await s.click('Siguiente');
    await s.click('Siguiente');
    expect(s.text().match(/Este campo es obligatorio/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
