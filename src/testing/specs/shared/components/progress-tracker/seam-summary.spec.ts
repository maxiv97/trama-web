import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { isCompact } from '../../../../../app/shared/components/progress-tracker/progress-tracker';
import { SeamSummary } from '../../../../../app/shared/components/progress-tracker/seam-summary';

const STEPS = ['Cargada', 'En revisión', 'Acordada', 'Recepcionada', 'En stock', 'Vendida', 'Liquidada'];

function render(opts: { current: number; negative?: boolean; terminal?: boolean }) {
  const fixture = TestBed.createComponent(SeamSummary);
  fixture.componentRef.setInput('steps', STEPS);
  fixture.componentRef.setInput('current', opts.current);
  if (opts.negative) fixture.componentRef.setInput('negative', true);
  if (opts.terminal) fixture.componentRef.setInput('terminal', true);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const toggle = host.querySelector('button') as HTMLButtonElement;
  return { fixture, host, toggle };
}

describe('isCompact · regla de cambio a la variante mobile', () => {
  it('usa la costura grande en contenedores anchos y la compacta por debajo de ~480 px', () => {
    expect(isCompact(700, 7, 22)).toBe(false);
    expect(isCompact(482, 7, 22)).toBe(false);
    expect(isCompact(481, 7, 22)).toBe(true);
    expect(isCompact(311, 7, 22)).toBe(true);
  });

  it('no decide nada mientras el ancho no se midió', () => {
    expect(isCompact(0, 7, 22)).toBe(false);
  });
});

describe('SeamSummary · recorrido compacto', () => {
  it('muestra el paso actual, su número y el siguiente', () => {
    const { host } = render({ current: 4 });
    expect(host.textContent).toContain('Paso 5 de 7');
    expect(host.textContent).toContain('En stock');
    expect(host.textContent).toContain('Sigue: Vendida');
  });

  it('oculta «Sigue» en el último paso y en los estados negativos o terminales', () => {
    expect(render({ current: 6 }).host.textContent).not.toContain('Sigue:');
    expect(render({ current: 3, negative: true }).host.textContent).not.toContain('Sigue:');
    expect(render({ current: 1, terminal: true }).host.textContent).not.toContain('Sigue:');
  });

  it('arranca colapsado y despliega el recorrido completo con el link', () => {
    const { fixture, host, toggle } = render({ current: 4 });
    expect(toggle.textContent?.trim()).toBe('Ver recorrido completo');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('ol')).toBeNull();

    toggle.click();
    fixture.detectChanges();

    expect(toggle.textContent?.trim()).toBe('Ocultar recorrido');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const list = host.querySelector('ol')!;
    expect(list.closest('[id]')?.id).toBe(toggle.getAttribute('aria-controls'));
    const items = Array.from(list.querySelectorAll('li'));
    expect(items).toHaveLength(7);
    expect(items[4].getAttribute('aria-current')).toBe('step');
    expect(items[4].textContent).toContain('Ahora');
  });
});
