import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { Shell } from '../../../../../src/app/shared/components/shell/shell';
import { AuthService } from '../../../../../src/app/core/auth/auth.service';
import { NotificationsService } from '../../../../../src/app/core/services/notifications.service';
import { of } from 'rxjs';

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

  it('muestra Propuestas en el menú del comercio', async () => {
    const merchant = { id: 'm1', name: 'Laura', role: 'merchant' as const };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'm', component: Host }]),
        {
          provide: AuthService,
          useValue: { user: signal(merchant), role: signal('merchant'), logout: () => {} },
        },
        { provide: NotificationsService, useValue: { unreadCountFor: () => of(0) } },
      ],
    });
    await TestBed.inject(Router).navigateByUrl('/m');
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/m/proposals"]');
    expect(link?.textContent).toContain('Propuestas');
  });
});
