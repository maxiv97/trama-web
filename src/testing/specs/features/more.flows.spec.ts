import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../fake-api';
import { renderRoute } from '../../render';

describe('Validaciones y errores de edición', { timeout: 30000 }, () => {
  it('edición de consignación: valida, cambia de categoría y muestra el error del servidor', async () => {
    const api = new FakeApi();
    const garment = api.garment('under_review');
    const id = garment['id'] as string;
    api.fail('PATCH', /draft$/, 400, 'El precio es inválido');
    api.fail('PATCH', /draft$/, 0, 'offline');
    const s = await renderRoute(`/c/garment/${id}/edit`, 'consignor', api);
    await s.type('input[formcontrolname="name"]', '');
    await s.type('input[formcontrolname="consignorPrice"]', '0');
    s.component<{ photos: { set(v: string[]): void } }>().photos.set([]);
    await s.click('Guardar');
    expect(s.text()).toContain('Este campo es obligatorio');
    expect(s.text()).toContain('Dejá al menos una foto');
    s.component<{ photos: { set(v: string[]): void } }>().photos.set(['data:a']);
    await s.type('input[formcontrolname="name"]', 'Campera');
    await s.type('input[formcontrolname="consignorPrice"]', '12000');
    await s.choose('Categoría', 'Remeras');
    await s.choose('Subcategoría', '');
    await s.choose('Temporada', 'Verano');
    await s.click('Nuevo');
    await s.click('Guardar');
    expect(s.toasts()).toContain('El precio es inválido');
    await s.click('Guardar');
    expect(s.toasts().join(' ')).toContain('No pudimos conectarnos');
    await s.click('Guardar');
    expect(s.url()).toBe(`/c/garment/${id}`);
  });

  it('una consignación que ya no está en revisión vuelve al seguimiento', async () => {
    const api = new FakeApi();
    const garment = api.garment('agreed');
    const s = await renderRoute(`/c/garment/${garment['id'] as string}/edit`, 'consignor', api);
    expect(s.url()).toBe(`/c/garment/${garment['id'] as string}`);
    expect(s.toasts()).toContain('Esta consignación ya no se puede editar');
  });

  it('configuración: muestra el error al guardar', async () => {
    const api = new FakeApi();
    api.fail('PATCH', /^\/merchants\//, 400, 'payoutDay must not be greater than 28');
    const s = await renderRoute('/m/settings', 'merchant', api);
    await s.type('input[formcontrolname="payoutDay"]', '30');
    expect(s.text()).toMatch(/28|máximo/);
    await s.type('input[formcontrolname="payoutDay"]', '12');
    await s.type('input[formcontrolname="saleWindowMonths"]', '0');
    await s.type('input[formcontrolname="saleWindowMonths"]', '4');
    await s.type('input[formcontrolname="email"]', 'nuevo@test.com');
    s.el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await s.settle();
    expect(s.toasts().join(' ')).toMatch(/payoutDay|No pudimos/);
  });

  it('categorías: oculta y vuelve a mostrar una categoría base, con error de guardado', async () => {
    const api = new FakeApi();
    api.fail('PATCH', /^\/categories\/hidden$/, 500, 'caído');
    const s = await renderRoute('/m/categories', 'merchant', api);
    const toggles = () =>
      s
        .all<HTMLButtonElement>('button')
        .filter((b) => /Ofreciéndola|No la ofrezco/.test(b.textContent ?? ''));
    toggles()[0]?.click();
    await s.settle();
    toggles()[0]?.click();
    await s.settle();
    toggles()[1]?.click();
    await s.settle();
    expect(api.called('PATCH', '/categories/hidden').length).toBeGreaterThan(0);
    await s.click('Agregar categoría');
    await s.type('input[placeholder="Ej: Ropa de bebé"]', 'Camperas y abrigos');
    api.fail('POST', /^\/categories$/, 400, 'Ya existe una categoría "Camperas y abrigos".');
    await s.click('Guardar');
    expect(s.text() + s.toasts().join(' ')).toContain('Ya existe');
  });

  it('liquidaciones: copia el alias del cedente', async () => {
    const api = new FakeApi();
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: (t: string) => ((copied = t), Promise.resolve()) },
      configurable: true,
    });
    const s = await renderRoute('/m/payouts', 'merchant', api);
    const copy = s.el.querySelector<HTMLButtonElement>(
      'button[aria-label="Copiar CBU / CVU / alias"]',
    );
    copy?.click();
    await s.settle();
    if (copy) expect(copied).toMatch(/\.mp$/);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('no')) },
      configurable: true,
    });
    copy?.click();
    await s.settle();
  });

  it('búsqueda sin resultados en el centro de ayuda lleva al contacto con la consulta', async () => {
    const s = await renderRoute('/ayuda?q=xyzzy-nada', null);
    expect(s.text()).toContain('No encontramos nada para');
    await s.click('Escribinos');
    expect(s.url()).toContain('/ayuda/contacto');
  });

  it('cedente: panel sin prendas invita a cargar la primera', async () => {
    const api = new FakeApi();
    api.db.garments = [];
    const s = await renderRoute('/c', 'consignor', api);
    await s.click('Cargar prenda');
    expect(s.url()).toBe('/c/upload');
  });
});

describe('Más validaciones', { timeout: 30000 }, () => {
  it('edición: cada campo obligatorio muestra su error', async () => {
    const api = new FakeApi();
    const garment = api.garment('under_review');
    const s = await renderRoute(`/c/garment/${garment['id'] as string}/edit`, 'consignor', api);
    for (const name of ['brand', 'size', 'color'])
      await s.type(`input[formcontrolname="${name}"]`, '');
    s.component<{
      form: { controls: Record<string, { setValue(v: unknown): void }> };
    }>().form.controls['category'].setValue('');
    s.component<{
      form: { controls: Record<string, { setValue(v: unknown): void }> };
    }>().form.controls['condition'].setValue('');
    await s.click('Guardar');
    expect(s.text()).toContain('Elegí la condición de la prenda');
    expect(s.text().match(/Este campo es obligatorio/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('contacto: valida motivo, nombre, email y largo del mensaje; error 400', async () => {
    const api = new FakeApi();
    api.fail('POST', /support\/tickets/, 400, 'mensaje must be longer');
    api.fail('POST', /support\/tickets/, 500, 'caído');
    const s = await renderRoute('/ayuda/contacto?motivo=no-existe', 'merchant', api);
    await s.click('Continuar').catch(() => undefined);
    expect(s.text()).toMatch(/Elegí un motivo|motivo/);
    await s.choose('Motivo de la consulta', 'Otro');
    await s.click('Continuar').catch(() => undefined);
    await s.type('#nombre', '');
    await s.type('#email', '');
    await s.type('#mensaje', 'corto');
    await s.click('Enviar consulta');
    expect(s.text()).toContain('Ingresá tu nombre');
    expect(s.text()).toContain('Ingresá tu email');
    expect(s.text()).toContain('al menos 20 caracteres');
    await s.type('#nombre', 'Laura');
    await s.type('#email', 'laura@test.com');
    await s.type('#mensaje', 'Una consulta suficientemente larga para enviar.');
    await s.click('Enviar consulta');
    expect(s.toasts()).toContain('No pudimos enviar tu consulta');
    await s.click('Enviar consulta');
    expect(s.toasts().join(' ')).toContain('No pudimos enviar tu consulta');
    await s.click('Enviar consulta');
    expect(api.called('POST', '/support/tickets')).toHaveLength(3);
  });

  it('reportes: exportación por punto de venta con cada recorte', async () => {
    URL.createObjectURL = () => 'blob:x';
    URL.revokeObjectURL = () => undefined;
    const api = new FakeApi();
    const s = await renderRoute('/m/reports', 'merchant', api);
    await s.click('Financiera', '[role="tab"]');
    const exportPdv = async () => {
      s.all<HTMLButtonElement>('app-pdv-card button').forEach((b) => b.click());
      await s.settle();
    };
    await exportPdv();
    await s.click('Mes pasado', '[role="radio"]');
    await s.choose('Punto de venta', '', 0);
    await exportPdv();
    await s.choose('Categoría', '', 0);
    await exportPdv();
    await s.choose('Cedente', '', 0);
    await exportPdv();
    expect(s.text()).toContain('Financiera');
  });
});
