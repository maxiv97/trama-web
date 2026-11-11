import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TOAST_DURATION_MS,
  ToastService,
} from '../../../../../src/app/shared/components/toast/toast.service';

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('por defecto el toast es de éxito y sin detalle', () => {
    const service = TestBed.inject(ToastService);
    service.show('Liquidación registrada');
    expect(service.messages()).toEqual([
      { id: 1, text: 'Liquidación registrada', type: 'success', detail: undefined },
    ]);
  });

  it('acepta aviso y una segunda línea de detalle', () => {
    const service = TestBed.inject(ToastService);
    service.show('Consignación por vencer', 'warning', '4 prendas vencen en 3 días.');
    expect(service.messages()[0]).toMatchObject({
      type: 'warning',
      detail: '4 prendas vencen en 3 días.',
    });
  });

  it('dura 5 segundos y después se va solo', () => {
    const service = TestBed.inject(ToastService);
    service.show('Propuesta enviada');

    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(service.messages()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(service.messages()).toHaveLength(0);
  });

  it('cada toast se cierra a su tiempo, sin llevarse a los demás', () => {
    const service = TestBed.inject(ToastService);
    service.show('Primero');
    vi.advanceTimersByTime(2000);
    service.show('Segundo');

    vi.advanceTimersByTime(TOAST_DURATION_MS - 2000);
    expect(service.messages().map((toast) => toast.text)).toEqual(['Segundo']);
  });
});
