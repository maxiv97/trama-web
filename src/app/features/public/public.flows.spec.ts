import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../../testing/fake-api';
import { renderRoute } from '../../../testing/render';

describe('Pantallas públicas y sesión', { timeout: 30000 }, () => {
  it('login: error de credenciales e ingreso por rol', async () => {
    const api = new FakeApi();
    let s = await renderRoute('/login', null, api);
    await s.click('Ingresar', 'button');
    expect(api.called('POST', '/auth/login')).toHaveLength(0);
    await s.type('#email', 'camila@test.com');
    await s.type('#password', 'incorrecta');
    await s.click('Ingresar', 'button[type="submit"]');
    expect(s.text()).toContain('El email o la contraseña no son correctos');
    await s.type('#password', 'trama1234');
    await s.click('Ingresar', 'button[type="submit"]');
    expect(s.url()).toBe('/c');

    s = await renderRoute('/login', null, api);
    await s.type('#email', 'comercio@test.com');
    await s.type('#password', 'trama1234');
    await s.click('Ingresar', 'button[type="submit"]');
    expect(s.url()).toBe('/m');
  });

  it('login: sin conexión con el servidor', async () => {
    const api = new FakeApi();
    api.fail('POST', /auth\/login/, 0, 'offline');
    const s = await renderRoute('/login', null, api);
    await s.type('#email', 'a@b.com');
    await s.type('#password', 'x');
    await s.click('Ingresar', 'button[type="submit"]');
    expect(s.text()).toMatch(/servidor|conect/i);
  });

  it('una sesión vencida (401) cierra la sesión y vuelve al ingreso', async () => {
    const api = new FakeApi();
    api.fail('GET', /^\/reports\/dashboard$/, 401, 'Sesión vencida');
    const s = await renderRoute('/m', 'merchant', api);
    expect(s.url()).toBe('/login');
    expect(localStorage.getItem('trama.token')).toBeNull();
  });

  it('menú de usuario, navegación y cierre de sesión', async () => {
    const s = await renderRoute('/m', 'merchant');
    const avatar = s.all<HTMLButtonElement>('app-user-menu button')[0];
    avatar.click();
    await s.settle();
    expect(s.text()).toContain('Cerrar sesión');
    s.all<HTMLElement>('app-user-menu a')[0]?.click();
    await s.settle();
    s.all<HTMLButtonElement>('app-user-menu button')[0].click();
    await s.settle();
    await s.click('Cerrar sesión');
    expect(s.url()).toBe('/login');
    await s.navigate('/c');
    expect(s.url()).toBe('/login');
  });

  it('shell: más opciones en el celular y campana de avisos', async () => {
    const s = await renderRoute('/m', 'merchant');
    const more = s.all<HTMLButtonElement>('nav[aria-label="Navegación"] button').pop();
    more?.click();
    await s.settle();
    s.all<HTMLElement>('a')
      .find((a) => (a.textContent ?? '').includes('Categorías'))
      ?.click();
    await s.settle();
    s.el.querySelector<HTMLElement>('[aria-label="Notificaciones"]')?.click();
    await s.settle();
    expect(s.url()).toMatch(/notifications|categories|\/m/);
  });

  it('centro de ayuda: rol, buscador y resultados', async () => {
    const s = await renderRoute('/ayuda', null);
    await s.click('Comercio', '[role="radio"]');
    await s.click('Cedente', '[role="radio"]');
    const box = s.el.querySelector<HTMLInputElement>(
      'input[type="search"], input[role="combobox"]',
    )!;
    await s.type(box, 'retirar prenda');
    expect(s.text()).toMatch(/retir/i);
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await s.settle();
    await s.type(box, 'retirar prenda');
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await s.settle();
    expect(s.url()).toMatch(/\/ayuda\//);
    await s.navigate('/ayuda');
    const box2 = s.el.querySelector<HTMLInputElement>(
      'input[type="search"], input[role="combobox"]',
    )!;
    await s.type(box2, 'xyzzy palabra inexistente');
    expect(s.text()).toMatch(/No encontramos|Sin resultados|no hay/i);
    await s.click('Borrar búsqueda', 'button[aria-label="Borrar búsqueda"]').catch(async () => {
      s.el.querySelector<HTMLButtonElement>('button[aria-label="Borrar búsqueda"]')?.click();
      await s.settle();
    });
    await s.type(box2, 'liquidación');
    const seeAll = s
      .all<HTMLButtonElement>('button')
      .find((b) => /Ver todos|Ver todas/.test(b.textContent ?? ''));
    seeAll?.click();
    await s.settle();
  });

  it('preguntas frecuentes: temas, búsqueda y enlace directo', async () => {
    const s = await renderRoute('/ayuda/faq?q=plazo', null);
    expect(s.text()).toContain('Preguntas frecuentes');
    for (const b of s.all<HTMLButtonElement>('nav[aria-label="Temas"] button').slice(0, 3)) {
      b.click();
      await s.settle();
    }
    for (const item of s.all<HTMLElement>('app-help-faq-item button, summary').slice(0, 4)) {
      item.click();
      await s.settle();
    }
    await s.click('Comercio', '[role="radio"]');
    await s.navigate('/ayuda/faq#no-se-vende');
    expect(s.text()).toContain('no se vende');
    await s.navigate('/ayuda/guia/registrar-devolucion');
    expect(s.text()).toContain('Registrar');
    await s.navigate('/ayuda/guia/no-existe');
    expect(s.text().length).toBeGreaterThan(0);
  });

  it('contacto: sugerencias por motivo y envío del ticket', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/ayuda/contacto', null, api);
    await s.choose('Motivo de la consulta', 'Liquidaciones y pagos');
    expect(s.text()).toMatch(/\?/);
    await s.click('Ya lo revisé, quiero escribir');
    await s.click('Enviar consulta');
    expect(api.called('POST', '/support/tickets')).toHaveLength(0);
    await s.click('Comercio', '[role="radio"]');
    await s.type('#nombre', 'Laura');
    await s.type('#email', 'laura@test.com');
    await s.type('#mensaje', 'No veo la liquidación de septiembre de una cedente.');
    await s.click('Enviar consulta');
    expect(api.called('POST', '/support/tickets')[0].body).toMatchObject({
      motivo: 'liquidaciones',
      nombre: 'Laura',
    });
    expect(s.text()).toContain('TR-2026-000042');
  });

  it('contacto con sesión: precarga los datos y adjunta una captura en un problema técnico', async () => {
    const api = new FakeApi();
    api.fail('POST', /support\/tickets/, 429, 'Demasiadas consultas');
    const s = await renderRoute('/ayuda/contacto?motivo=problema', 'consignor', api);
    await s.click('Continuar').catch(() => undefined);
    const page = s.component<{ onCapture(p: string[]): void }>();
    page.onCapture(['data:image/png;base64,' + 'A'.repeat(100)]);
    page.onCapture(['data:image/png;base64,' + 'A'.repeat(7_000_000)]);
    await s.settle();
    expect(s.text()).toContain('supera los 5 MB');
    page.onCapture([]);
    await s.type('#mensaje', 'La pantalla de seguimiento no carga desde ayer.');
    await s.click('Enviar consulta');
    expect(s.toasts().join(' ')).toContain('Recibimos varias consultas desde este email');
  });
});
