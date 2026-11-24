import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PlatformConfigService } from '../../../../src/app/core/services/platform-config.service';

function serviceWith(response: ReturnType<HttpClient['get']>) {
  TestBed.configureTestingModule({
    providers: [{ provide: HttpClient, useValue: { get: () => response } }],
  });
  return TestBed.inject(PlatformConfigService);
}

describe('PlatformConfigService', () => {
  it('prende el aviso cuando el back tiene la monetización activa', () => {
    expect(serviceWith(of({ monetization: true })).monetization()).toBe(true);
  });

  it('lo deja apagado cuando está desactivada', () => {
    expect(serviceWith(of({ monetization: false })).monetization()).toBe(false);
  });

  it('si el pedido falla, no muestra el aviso', () => {
    expect(serviceWith(throwError(() => new Error('sin red'))).monetization()).toBe(false);
  });
});
