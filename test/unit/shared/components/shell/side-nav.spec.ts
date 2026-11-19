import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { Role } from '../../../../../src/app/core/models/user.model';
import { NAV_ITEMS } from '../../../../../src/app/shared/components/shell/nav-items';
import { SideNav } from '../../../../../src/app/shared/components/shell/side-nav';

@Component({ template: '' })
class Blank {}

async function render(role: Role, url: string, unread = 0) {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', component: Blank }])],
  });
  const fixture = TestBed.createComponent(SideNav);
  fixture.componentRef.setInput('items', NAV_ITEMS[role]);
  fixture.componentRef.setInput('role', role);
  fixture.componentRef.setInput('unread', unread);
  await TestBed.inject(Router).navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const labelOf = (link: Element) => link.textContent?.replace(/\s+/g, ' ').trim();

describe('SideNav', () => {
  it('muestra el rol y las secciones del comercio en el orden del documento', async () => {
    const host = await render('merchant', '/m');
    expect(host.querySelector('.role')?.textContent?.trim()).toBe('Comercio');
    expect(Array.from(host.querySelectorAll('nav a')).map(labelOf)).toEqual([
      'Panel',
      'Propuestas',
      'Inventario',
      'Liquidaciones',
      'Reportes',
      'Mis cedentes',
      'Puntos de venta',
      'Categorías',
      'Configuración',
      'Notificaciones',
    ]);
  });

  it('la sección activa lleva el ícono sobre el blob y aria-current', async () => {
    const host = await render('merchant', '/m/inventory');
    const links = Array.from(host.querySelectorAll('nav a'));
    const active = links.find((link) => labelOf(link) === 'Inventario')!;
    expect(active.classList.contains('active')).toBe(true);
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.querySelector('app-blob-icon')).not.toBeNull();
    expect(host.querySelectorAll('nav app-blob-icon')).toHaveLength(1);
  });

  it('el panel solo está activo en su ruta exacta', async () => {
    const host = await render('consignor', '/c/payouts');
    const panel = host.querySelector('nav a')!;
    expect(labelOf(panel)).toBe('Mi panel');
    expect(panel.classList.contains('active')).toBe(false);
  });

  it('Notificaciones muestra el contador de sin leer, y el lector lo escucha', async () => {
    const host = await render('consignor', '/c', 3);
    const count = host.querySelector('.count');
    expect(count?.textContent?.replace(/\s+/g, ' ').trim()).toBe('3 sin leer');
  });

  it('sin notificaciones nuevas no hay contador', async () => {
    expect((await render('consignor', '/c', 0)).querySelector('.count')).toBeNull();
  });
});
