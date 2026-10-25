import { describe, expect, it } from 'vitest';
import { FakeApi } from '../../../../fake-api';
import { renderRoute, Screen } from '../../../../render';

async function clickAll(s: Screen, selector: string, pattern: RegExp): Promise<void> {
  for (const b of s.all<HTMLButtonElement>(selector)) {
    if (pattern.test((b.textContent ?? '').trim())) {
      b.click();
      await s.settle();
    }
  }
}

describe('Reportes de cumplimiento y vencimientos', { timeout: 30000 }, () => {
  it('cumplimiento de los cedentes: entrega y retiro, todos y CSV', async () => {
    const s = await renderRoute('/m/reports#rep-cumplimiento', 'merchant');
    const card = 'app-cumplimiento-card button';
    expect(s.text()).toContain('¿Qué cedentes entregan lo que acuerdan?');
    await clickAll(s, card, /^Ver todos/);
    await clickAll(s, card, /^Cumplimiento de retiro$/);
    expect(s.text()).toContain('¿Qué cedentes retiran lo que no se vende?');
    await clickAll(s, card, /^Ver solo/);
    await clickAll(s, card, /^CSV$/);
    await clickAll(s, card, /^Cumplimiento de entrega$/);
    await clickAll(s, card, /^CSV$/);
  });

  it('vencimientos: destino de lo no vendido, sin pendientes y sin vencimientos', async () => {
    const api = new FakeApi();
    let s = await renderRoute('/m/reports#rep-vencimientos', 'merchant', api);
    expect(s.text()).toContain('57%');

    Object.assign(api.db.reports['expiryOutcomes'] as object, {
      unclaimedCount: 0,
      unclaimedPendingCount: 0,
      pickupRate: null,
    });
    s = await renderRoute('/m/reports#rep-vencimientos', 'merchant', api);
    expect(s.text()).toContain('—');

    Object.assign(api.db.reports['expiryOutcomes'] as object, { expiredCount: 0 });
    s = await renderRoute('/m/reports#rep-vencimientos', 'merchant', api);
    expect(s.text()).not.toContain('57%');
  });

  it('la tarjeta de vencimientos ofrece reintentar si fallan', async () => {
    for (const [hash, path] of [['rep-vencimientos', /^\/reports\/expiry-outcomes$/] as const]) {
      const api = new FakeApi();
      api.fail('GET', path, 500, 'error', 1);
      const s = await renderRoute(`/m/reports#${hash}`, 'merchant', api);
      expect(s.text()).toContain('No pudimos cargar el reporte.');
      await clickAll(s, 'app-error-state button', /Reintentar|Volver a intentar/);
    }
  });
});
