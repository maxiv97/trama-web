import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Toast } from '../../../../../src/app/shared/components/toast/toast';
import { ToastService } from '../../../../../src/app/shared/components/toast/toast.service';

function render() {
  const fixture = TestBed.createComponent(Toast);
  const service = TestBed.inject(ToastService);
  return {
    service,
    host: fixture.nativeElement as HTMLElement,
    update: () => fixture.detectChanges(),
  };
}

describe('Toast', () => {
  it('muestra el título, el detalle y el hilo que marca el tiempo', () => {
    const { service, host, update } = render();
    service.show('Propuesta enviada', 'success', 'El comercio tiene 48 h para responder.');
    update();

    const toast = host.querySelector('.toast')!;
    expect(toast.querySelector('.title')?.textContent?.trim()).toBe('Propuesta enviada');
    expect(toast.querySelector('.detail')?.textContent?.trim()).toBe(
      'El comercio tiene 48 h para responder.',
    );
    expect(toast.querySelector('.timer line')).not.toBeNull();
  });

  it('sin detalle muestra solo el título', () => {
    const { service, host, update } = render();
    service.show('Liquidación registrada');
    update();
    expect(host.querySelector('.detail')).toBeNull();
  });

  it('el error se anuncia como alerta y el resto como estado', () => {
    const { service, host, update } = render();
    service.show('No pudimos registrar la venta', 'error');
    service.show('Liquidación registrada');
    update();

    const [error, success] = Array.from(host.querySelectorAll('.toast'));
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.classList.contains('is-error')).toBe(true);
    expect(success.getAttribute('role')).toBe('status');
  });

  it('el aviso usa su propio color', () => {
    const { service, host, update } = render();
    service.show('Consignación por vencer', 'warning');
    update();
    expect(host.querySelector('.toast')?.classList.contains('is-warning')).toBe(true);
  });
});
