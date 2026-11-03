import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { Shell } from '../../../../../src/app/shared/components/shell/shell';

@Component({
  imports: [Shell],
  template: `<app-shell><p>CONTENIDO</p></app-shell>`,
})
class Host {}

describe('Shell', () => {
  it('proyecta el contenido en rutas públicas', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('CONTENIDO');
  });
});
