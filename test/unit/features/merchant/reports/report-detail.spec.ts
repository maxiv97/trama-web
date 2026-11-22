import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  ReportDetail,
  ReportDetailData,
} from '../../../../../src/app/features/merchant/reports/report-detail/report-detail';

// jsdom tiene <dialog> pero no sus métodos
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => vi.restoreAllMocks());

const STOCK: ReportDetailData = {
  title: 'Stock de 91-120 días',
  csvName: 'stock-91-120',
  rows: [
    { name: 'Campera de jean', meta: 'Camperas · Levi’s', status: 'in_stock' },
    { name: 'Vestido lino', meta: 'Vestidos · Zara', status: 'with_remarks' },
  ],
};

@Component({
  imports: [ReportDetail],
  template: `
    <app-report-detail
      question="¿Qué stock no rota?"
      [detail]="detail()"
      (closed)="detail.set(null); closedTimes = closedTimes + 1"
    />
  `,
})
class Host {
  readonly detail = signal<ReportDetailData | null>(null);
  closedTimes = 0;
}

async function setup(detail: ReportDetailData | null = STOCK) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.detail.set(detail);
  fixture.detectChanges();
  await fixture.whenStable();
  const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
  return { fixture, dialog };
}

describe('ReportDetail', () => {
  it('sin nada abierto, el drawer está cerrado', async () => {
    expect((await setup(null)).dialog.open).toBe(false);
  });

  it('abre el drawer con la pregunta, lo que se abrió y cuántas prendas son', async () => {
    const { dialog } = await setup();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('.eyebrow')?.textContent?.trim()).toBe('¿Qué stock no rota?');
    expect(dialog.querySelector('h2')?.textContent?.trim()).toBe('Stock de 91-120 días');
    expect(dialog.querySelector('.lead')?.textContent?.trim()).toBe('2 prendas');
  });

  it('lista cada prenda con su dato y su estado', async () => {
    const { dialog } = await setup();
    const items = Array.from(dialog.querySelectorAll('li'));
    expect(items.map((item) => item.querySelector('.name')?.textContent?.trim())).toEqual([
      'Campera de jean',
      'Vestido lino',
    ]);
    expect(items[0].querySelector('.trama-table__meta')?.textContent?.trim()).toBe(
      'Camperas · Levi’s',
    );
    expect(items[0].querySelector('app-status-badge')).not.toBeNull();
  });

  it('sin prendas lo dice, y no ofrece descargar', async () => {
    const { dialog } = await setup({ ...STOCK, rows: [] });
    expect(dialog.querySelector('.empty')?.textContent?.trim()).toBe(
      'No hay prendas para este recorte.',
    );
    expect(dialog.querySelector('.lead')?.textContent?.trim()).toBe('0 prendas');
    expect(dialog.querySelector('footer button')).toBeNull();
  });

  it('al pie descarga la lista en CSV, con el nombre del detalle', async () => {
    const { dialog } = await setup();
    URL.createObjectURL = vi.fn(() => 'blob:csv');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    dialog.querySelector<HTMLButtonElement>('footer button')!.click();
    expect(click).toHaveBeenCalledOnce();
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('stock-91-120.csv');
  });

  it('al cerrarlo avisa a la tarjeta', async () => {
    const { fixture, dialog } = await setup();
    dialog.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.closedTimes).toBe(1);
    expect(fixture.componentInstance.detail()).toBeNull();
  });
});
