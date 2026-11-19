import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '../../../../../src/app/core/models/user.model';
import { UserMenu } from '../../../../../src/app/shared/components/user-menu/user-menu';

function render(role: Role, name = 'Lucía Fernández') {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(UserMenu);
  fixture.componentRef.setInput('name', name);
  fixture.componentRef.setInput('role', role);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const open = () => {
    host.querySelector<HTMLButtonElement>('.trigger')!.click();
    fixture.detectChanges();
  };
  return { fixture, host, open };
}

describe('UserMenu', () => {
  it('el botón del cedente es su burbuja con las iniciales', () => {
    const { host } = render('consignor');
    expect(host.querySelector('.trigger app-blob-icon .initials')?.textContent?.trim()).toBe('LF');
  });

  it('el botón del comercio es el local sobre el blob', () => {
    const { host } = render('merchant', 'Moda Circular');
    const blob = host.querySelector('.trigger app-blob-icon');
    expect(blob?.querySelector('.initials')).toBeNull();
    expect(blob?.querySelector('.glyph')).not.toBeNull();
  });

  it('abre el panel con el nombre y el rol, y avisa que está abierto', () => {
    const { host, open } = render('consignor');
    const trigger = host.querySelector('.trigger')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    open();
    const panel = host.querySelector('.panel')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.querySelector('.identity b')?.textContent?.trim()).toBe('Lucía Fernández');
    expect(panel.querySelector('.identity span')?.textContent?.trim()).toBe('Cedente');
  });

  it('solo el comercio tiene Configuración', () => {
    const consignor = render('consignor');
    consignor.open();
    expect(consignor.host.querySelector('a.option')).toBeNull();

    TestBed.resetTestingModule();
    const merchant = render('merchant', 'Moda Circular');
    merchant.open();
    expect(merchant.host.querySelector('a.option')?.getAttribute('href')).toBe('/m/settings');
  });

  it('Cerrar sesión avisa y cierra el panel', () => {
    const { fixture, host, open } = render('consignor');
    const logout = vi.fn();
    fixture.componentInstance.logout.subscribe(logout);
    open();
    host.querySelector<HTMLButtonElement>('.logout')!.click();
    fixture.detectChanges();
    expect(logout).toHaveBeenCalledOnce();
    expect(host.querySelector('.panel')).toBeNull();
  });

  it('Escape cierra y devuelve el foco al botón', () => {
    const { fixture, host, open } = render('consignor');
    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(host.querySelector('.panel')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('.trigger'));
  });

  it('un clic afuera lo cierra; uno adentro, no', () => {
    const { fixture, host, open } = render('consignor');
    document.body.appendChild(host);
    open();
    host.querySelector<HTMLElement>('.identity')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.panel')).not.toBeNull();

    document.body.click();
    fixture.detectChanges();
    expect(host.querySelector('.panel')).toBeNull();
    host.remove();
  });
});
