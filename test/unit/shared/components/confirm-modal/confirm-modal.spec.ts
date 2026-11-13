import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  ConfirmColor,
  ConfirmModal,
} from '../../../../../src/app/shared/components/confirm-modal/confirm-modal';

function render(inputs: { open?: boolean; color?: ConfirmColor; field?: string } = {}) {
  const fixture = TestBed.createComponent(ConfirmModal);
  fixture.componentRef.setInput('open', inputs.open ?? true);
  fixture.componentRef.setInput('title', 'Registrar liquidación');
  fixture.componentRef.setInput('body', '¿Confirmás el pago?');
  fixture.componentRef.setInput('confirmLabel', 'Registrar');
  if (inputs.color) fixture.componentRef.setInput('confirmColor', inputs.color);
  if (inputs.field) fixture.componentRef.setInput('optionalField', inputs.field);
  fixture.detectChanges();

  const host = fixture.nativeElement as HTMLElement;
  const events = { confirmed: [] as (string | undefined)[], cancelled: 0 };
  fixture.componentInstance.confirmed.subscribe((value) => events.confirmed.push(value));
  fixture.componentInstance.cancelled.subscribe(() => events.cancelled++);
  const buttons = () => Array.from(host.querySelectorAll<HTMLButtonElement>('.actions button'));
  return { fixture, host, events, buttons };
}

describe('ConfirmModal', () => {
  it('cerrado no muestra nada', () => {
    expect(render({ open: false }).host.querySelector('.dialog')).toBeNull();
  });

  it('es un diálogo con el título como nombre accesible', () => {
    const { host } = render();
    const dialog = host.querySelector('[role="dialog"]')!;
    const title = host.querySelector('h2')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent?.trim()).toBe('Registrar liquidación');
  });

  it('Cancelar es fantasma y la acción va a la derecha, verde por defecto', () => {
    const [cancel, action] = render().buttons();
    expect(cancel.classList.contains('trama-btn--ghost')).toBe(true);
    expect(action.textContent?.trim()).toBe('Registrar');
    expect(action.classList.contains('trama-btn--danger')).toBe(false);
  });

  it('la variante roja usa el botón destructivo', () => {
    const [, action] = render({ color: 'red' }).buttons();
    expect(action.classList.contains('trama-btn--danger')).toBe(true);
  });

  it('confirma con el valor del campo opcional, sin espacios de más', async () => {
    const { fixture, host, events, buttons } = render({ field: 'Motivo (opcional)' });
    const input = host.querySelector<HTMLInputElement>('input.trama-input')!;
    input.value = '  Tiene una mancha  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    buttons()[1].click();
    expect(events.confirmed).toEqual(['Tiene una mancha']);
  });

  it('se cancela con Cancelar, tocando afuera o con Escape', () => {
    const { host, events, buttons } = render();
    buttons()[0].click();
    host.querySelector<HTMLElement>('.overlay')!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(events.cancelled).toBe(3);
  });

  it('un clic dentro del diálogo no lo cierra', () => {
    const { host, events } = render();
    host.querySelector<HTMLElement>('.dialog')!.click();
    expect(events.cancelled).toBe(0);
  });

  it('Escape no hace nada si el modal está cerrado', () => {
    const { events } = render({ open: false });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(events.cancelled).toBe(0);
  });
});
