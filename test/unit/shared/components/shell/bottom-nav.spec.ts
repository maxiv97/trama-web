import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { Role } from '../../../../../src/app/core/models/user.model';
import { BottomNav } from '../../../../../src/app/shared/components/shell/bottom-nav';
import { NAV_ITEMS } from '../../../../../src/app/shared/components/shell/nav-items';

@Component({ template: '' })
class Blank {}

async function render(role: Role, url: string, unread = 0) {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: '**', component: Blank }])],
  });
  const fixture = TestBed.createComponent(BottomNav);
  fixture.componentRef.setInput('items', NAV_ITEMS[role]);
  fixture.componentRef.setInput('unread', unread);
  await TestBed.inject(Router).navigateByUrl(url);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

const labels = (links: NodeListOf<Element>) =>
  Array.from(links).map((link) => link.querySelector('.label')?.textContent?.trim() ?? '');

describe('BottomNav', () => {
  it('el cedente tiene pocas secciones: van todas en la barra, sin "Más"', async () => {
    const { host } = await render('consignor', '/c');
    expect(labels(host.querySelectorAll('.bar > a'))).toEqual([
      'Mi panel',
      'Mis liquidaciones',
      'Notificaciones',
    ]);
    expect(host.querySelector('.bar > button')).toBeNull();
  });

  it('el comercio ve cuatro secciones y "Más"', async () => {
    const { host } = await render('merchant', '/m');
    expect(labels(host.querySelectorAll('.bar > a'))).toEqual([
      'Panel',
      'Propuestas',
      'Inventario',
      'Liquidaciones',
    ]);
    expect(host.querySelector('.bar > button .label')?.textContent?.trim()).toBe('Más');
  });

  it('"Más" abre el panel con el resto de las secciones y se cierra al elegir una', async () => {
    const { fixture, host } = await render('merchant', '/m');
    const more = host.querySelector<HTMLButtonElement>('.bar > button')!;
    expect(more.getAttribute('aria-expanded')).toBe('false');

    more.click();
    fixture.detectChanges();
    const sheet = host.querySelector('.sheet')!;
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(more.getAttribute('aria-controls')).toBe(sheet.id);
    expect(sheet.querySelectorAll('a')).toHaveLength(6);

    sheet.querySelector<HTMLAnchorElement>('a')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.sheet')).toBeNull();
  });

  it('el panel se cierra tocando afuera o con Escape', async () => {
    const { fixture, host } = await render('merchant', '/m');
    const more = host.querySelector<HTMLButtonElement>('.bar > button')!;
    more.click();
    fixture.detectChanges();
    host.querySelector<HTMLElement>('.veil')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.sheet')).toBeNull();

    more.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(host.querySelector('.sheet')).toBeNull();
  });

  it('si la pantalla actual está adentro de "Más", el botón se marca activo', async () => {
    const { host } = await render('merchant', '/m/reports');
    expect(host.querySelector('.bar > button')?.classList.contains('active')).toBe(true);
  });

  it('si la pantalla actual está en la barra, "Más" no se marca', async () => {
    const { host } = await render('merchant', '/m/inventory');
    expect(host.querySelector('.bar > button')?.classList.contains('active')).toBe(false);
  });

  it('las notificaciones sin leer se avisan con un punto en "Más"', async () => {
    const { host } = await render('merchant', '/m', 2);
    expect(host.querySelector('.bar > button .dot')).not.toBeNull();
  });
});
