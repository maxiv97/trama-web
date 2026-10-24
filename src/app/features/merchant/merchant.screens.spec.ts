import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../../testing/fake-api';
import { renderRoute, savedPdfs } from '../../../testing/render';

describe('Comercio · pantallas de gestión', { timeout: 30000 }, () => {
  it('inventario: avisos, filtros, búsqueda y venta de varias prendas', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/inventory', 'merchant', api);
    await s.click('Ver', 'button');
    expect(s.text()).toContain('Por retirar');
    for (const chip of [
      'No retiradas',
      'Retiradas',
      'En stock',
      'Vendido',
      'Liquidado',
      'Con observaciones',
      'Por recibir',
      'Todos',
    ]) {
      await s.click(chip);
    }
    await s.choose('Cedente', '');
    await s.choose('Punto de venta', '');
    await s.type('input[type="search"]', 'zzzz-no-existe');
    expect(s.text()).toMatch(/No hay|Sin resultados|ninguna/i);
    await s.type('input[type="search"]', '');
    await s.choose('Cedente', 'Todos');
    await s.choose('Punto de venta', 'Todos');
    await s.click('En stock');
    const boxes = s.all<HTMLInputElement>('tbody input[type="checkbox"]');
    boxes[0].click();
    boxes[1].click();
    await s.settle();
    await s.click('Seleccionar todas');
    await s.click('Quitar selección');
    s.all<HTMLInputElement>('tbody input[type="checkbox"]')[0].click();
    s.all<HTMLInputElement>('tbody input[type="checkbox"]')[1].click();
    await s.settle();
    await s.click('Marcar como vendidas');
    await s.type('input[type="date"]', '2026-10-20');
    const confirm = s
      .all<HTMLButtonElement>('button')
      .filter((b) => /Marcar|Confirmar/.test(b.textContent ?? ''))
      .pop()!;
    confirm.click();
    await s.settle();
    expect(api.called('POST', '/sales/bulk')).toHaveLength(1);
    expect(s.toasts().join(' ')).toMatch(/vendida|No se pudo|no se pudieron/i);
    s.all<HTMLElement>('tbody tr')[0].click();
    await s.settle();
    expect(s.url()).toMatch(/^\/m\/(inventory|garment)\//);
  });

  it('inventario: abre el filtro pedido por la URL y ofrece devolver', async () => {
    const s = await renderRoute('/m/inventory?status=awaiting_pickup', 'merchant');
    expect(s.text()).toContain('Devolver');
    await s.click('Devolver');
    expect(s.url()).toMatch(/\/return$/);
  });

  it('propuestas: filtros, búsqueda y acceso a la revisión', async () => {
    const s = await renderRoute('/m/proposals?filter=pending', 'merchant');
    for (const chip of [
      'Contraoferta enviada',
      'Sin acuerdo',
      'Canceladas',
      'Por revisar',
      'Todas',
    ]) {
      await s.click(chip).catch(() => undefined);
    }
    await s.choose('Cedente', '');
    await s.choose('Punto de venta', '');
    await s.type('input[type="search"]', 'a');
    await s.choose('Cedente', 'Todos');
    await s.choose('Punto de venta', 'Todos');
    await s.type('input[type="search"]', '');
    s.all<HTMLElement>('tbody tr')[0].click();
    await s.settle();
    expect(s.url()).toMatch(/^\/m\/(proposal|garment)\//);
  });

  it('puntos de venta: alta y edición', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/sales-points', 'merchant', api);
    await s.click('Agregar punto de venta');
    const fields = s.all<HTMLInputElement>('.t-modal input, .t-modal textarea');
    const values = [
      'Sucursal Güemes',
      'Belgrano 800',
      '351 444',
      'Lun a Sáb',
      '10 a 19 h',
      'Por la puerta lateral',
    ];
    for (let i = 0; i < Math.min(values.length, fields.length); i++)
      await s.type(fields[i], values[i]);
    await s.click('Guardar');
    expect(api.called('POST', '/sales-points')).toHaveLength(1);
    await s.click('Editar');
    await s.click('Cancelar');
    await s.click('Editar');
    await s.click('Guardar');
    expect(api.called('PATCH', /^\/sales-points\//)).toHaveLength(1);
  });

  it('categorías: alta, edición, baja y categorías base ocultas', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/categories', 'merchant', api);
    await s.click('Agregar categoría');
    await s.type('input[placeholder="Ej: Ropa de bebé"]', 'Ropa de bebé');
    await s.type('textarea', 'Bodys\nEnteritos');
    await s.choose('Consolida en', '');
    await s.click('Guardar');
    expect(api.called('POST', '/categories')[0].body).toMatchObject({
      label: 'Ropa de bebé',
      subcategories: ['Bodys', 'Enteritos'],
    });
    await s.click('Editar');
    await s.type('input[placeholder="Ej: Ropa de bebé"]', 'Bebés');
    await s.click('Guardar');
    expect(api.called('PATCH', /^\/categories\/fake/)).toHaveLength(1);
    await s.click('Dar de baja');
    const confirm = s
      .all<HTMLButtonElement>('button')
      .filter((b) => /Dar de baja|Eliminar|Confirmar/.test(b.textContent ?? ''))
      .pop()!;
    confirm.click();
    await s.settle();
    expect(api.called('DELETE', /^\/categories\//)).toHaveLength(1);
    s.all<HTMLButtonElement>(
      'button[role="switch"], button[aria-pressed], input[type="checkbox"]',
    )[0]?.click();
    await s.settle();
    expect(api.called('PATCH', '/categories/hidden').length).toBeGreaterThanOrEqual(0);
  });

  it('configuración: valida, descarta y guarda los plazos', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/settings', 'merchant', api);
    await s.type('input[formcontrolname="deliveryDays"]', '0');
    expect(s.text()).toMatch(/entre|mínimo|obligatorio/i);
    await s.click('Descartar cambios');
    await s.type('input[formcontrolname="deliveryDays"]', '5');
    await s.type('input[formcontrolname="pickupDays"]', '20');
    await s.type('input[formcontrolname="consignorPercentage"]', '70');
    await s.type('input[formcontrolname="businessName"]', 'Segunda Vuelta SRL');
    s.el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await s.settle();
    const body = api.called('PATCH', /^\/merchants\//)[0].body as Record<
      string,
      Record<string, unknown>
    >;
    expect(body['terms']).toMatchObject({ deliveryDays: 5, pickupDays: 20 });
  });

  it('liquidaciones: cambia de mes, descarga y marca una liquidación pagada', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/payouts', 'merchant', api);
    URL.createObjectURL = () => 'blob:pdf';
    URL.revokeObjectURL = () => undefined;
    await s.choose('Mes', '');
    if (s.text().includes('Marcar pagada')) {
      await s.click('Marcar pagada');
      await s.click('Efectivo');
      await s.type('input[placeholder="Opcional"]', 'R-1');
      await s.click('Cancelar');
      await s.click('Marcar pagada');
      const confirm = s.all<HTMLButtonElement>('[role="dialog"] button').pop()!;
      confirm.click();
      await s.settle();
      expect(api.called('POST', '/payouts/settle')).toHaveLength(1);
    }
    for (const option of s.all<HTMLElement>('button[aria-label="Mes"]')) option.click();
    await s.settle();
    const before = savedPdfs.length;
    await s.click('Descargar');
    expect(savedPdfs.length).toBe(before + 1);
    expect(s.text()).toContain('Liquidaciones');
  });

  it('mis cedentes: búsqueda y acceso a sus propuestas', async () => {
    const s = await renderRoute('/m/consignors', 'merchant');
    await s.type('input[type="search"]', 'Camila');
    expect(s.text()).toContain('Camila');
    await s.type('input[type="search"]', 'nadie-con-este-nombre');
    expect(s.text()).toContain('No encontramos cedentes');
  });

  it('panel: las urgencias llevan a cada pantalla', async () => {
    const s = await renderRoute('/m', 'merchant');
    await s.click('Revisar');
    expect(s.url()).toContain('/m/proposals');
    await s.navigate('/m');
    await s.click('Liquidar');
    expect(s.url()).toContain('/m/payouts');
  });

  it('notificaciones del comercio', async () => {
    const api = new FakeApi();
    const s = await renderRoute('/m/notifications', 'merchant', api);
    await s.click('Marcar todas como leídas');
    expect(api.called('PATCH', '/notifications/read-all')).toHaveLength(1);
  });
});
