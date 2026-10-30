import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ErrorState } from './error-state';

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
});
