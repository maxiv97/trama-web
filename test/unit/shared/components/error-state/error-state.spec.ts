import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ErrorState } from '../../../../../src/app/shared/components/error-state/error-state';

describe('ErrorState', () => {
  it('emite retry al hacer click en el botón', () => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('message', 'No pudimos cargar.');
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.retry.subscribe(() => (emitted = true));

    const button = (fixture.nativeElement as HTMLElement).querySelector('button');
    button?.dispatchEvent(new MouseEvent('click'));

    expect(emitted).toBe(true);
  });

  it('en modo link renderiza un anchor con el label y sin botón', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('message', 'No encontramos esto.');
    fixture.componentRef.setInput('link', '/m');
    fixture.componentRef.setInput('linkLabel', 'Volver al panel');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const anchor = host.querySelector('a');
    expect(anchor?.textContent?.trim()).toBe('Volver al panel');
    expect(host.querySelector('button')).toBeNull();
  });

  it('por defecto el título es "Se cortó el hilo" y debajo va el mensaje', () => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('message', 'No pudimos cargar tu panel.');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.title')?.textContent?.trim()).toBe('Se cortó el hilo');
    expect(host.querySelector('.message')?.textContent?.trim()).toBe('No pudimos cargar tu panel.');
  });

  it('se anuncia como alerta y la ilustración es decorativa', () => {
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('message', 'No pudimos cargar.');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.querySelector('svg.cut-thread')?.getAttribute('aria-hidden')).toBe('true');
  });
});
