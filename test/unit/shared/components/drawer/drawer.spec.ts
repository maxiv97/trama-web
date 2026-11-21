import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it } from 'vitest';
import { Drawer } from '../../../../../src/app/shared/components/drawer/drawer';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

@Component({
  imports: [Drawer],
  template: `
    <app-drawer heading="Ventas">
      <p class="content">Vestido lino</p>
      @if (withFooter) {
        <button drawerFooter type="button" class="footer-action">Ver todas las ventas</button>
      }
    </app-drawer>
  `,
})
class Host {
  withFooter = true;
}

async function openDrawer() {
  const fixture = TestBed.createComponent(Drawer);
  fixture.componentRef.setInput('heading', '¿Qué se vendió esta semana?');
  fixture.componentRef.setInput('eyebrow', 'Ventas');
  fixture.componentRef.setInput('lead', '6 prendas · $142.300');
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  await fixture.whenStable();
  const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
  return { fixture, dialog, drawer: fixture.componentInstance };
}

function withContent(withFooter: boolean) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.withFooter = withFooter;
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
}

describe('Drawer', () => {
  it('cerrado, el panel no está abierto', () => {
    const fixture = TestBed.createComponent(Drawer);
    fixture.componentRef.setInput('heading', 'Ventas');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(false);
  });

  it('al abrirse muestra la pregunta, con la que se lo nombra', async () => {
    const { dialog } = await openDrawer();
    expect(dialog.open).toBe(true);
    const heading = dialog.querySelector('h2')!;
    expect(heading.textContent?.trim()).toBe('¿Qué se vendió esta semana?');
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(dialog.querySelector('.eyebrow')?.textContent?.trim()).toBe('Ventas');
    expect(dialog.getAttribute('aria-describedby')).toBe(dialog.querySelector('.lead')!.id);
  });

  it('el botón Cerrar lo cierra', async () => {
    const { fixture, dialog, drawer } = await openDrawer();
    dialog.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(drawer.open()).toBe(false);
    expect(dialog.open).toBe(false);
  });

  it('si el navegador lo cierra (Escape), avisa que quedó cerrado', async () => {
    const { dialog, drawer } = await openDrawer();
    dialog.close();
    expect(drawer.open()).toBe(false);
  });

  it('un clic en el fondo lo cierra; uno en el contenido, no', async () => {
    const { dialog, drawer } = await openDrawer();
    dialog.querySelector<HTMLElement>('h2')!.click();
    expect(drawer.open()).toBe(true);
    dialog.click();
    expect(drawer.open()).toBe(false);
  });

  it('muestra el contenido y la acción al pie', () => {
    const dialog = withContent(true);
    expect(dialog.querySelector('.body .content')).not.toBeNull();
    expect(dialog.querySelector('footer .footer-action')).not.toBeNull();
  });

  it('sin acción, el pie queda vacío', () => {
    expect(withContent(false).querySelector('footer')?.children.length).toBe(0);
  });
});
