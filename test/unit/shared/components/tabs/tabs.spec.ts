import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Tabs } from '../../../../../src/app/shared/components/tabs/tabs';

@Component({
  imports: [Tabs],
  template: `
    <app-tabs #tabs ariaLabel="Reportes" [options]="options" [(value)]="value" />
    @if (value(); as current) {
      <section
        role="tabpanel"
        [id]="tabs.panelId(current)"
        [attr.aria-labelledby]="tabs.tabId(current)"
      >
        {{ current }}
      </section>
    }
  `,
})
class Host {
  readonly options = [
    { value: 'sales', label: 'Ventas' },
    { value: 'stock', label: 'Stock' },
    { value: 'payments', label: 'Pagos' },
  ];
  readonly value = signal('sales');
}

function setup(value = 'sales') {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.value.set(value);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const tabs = () => Array.from(element.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const press = (index: number, key: string) => {
    tabs()[index].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  };
  return { fixture, element, tabs, press };
}

describe('Tabs', () => {
  it('es una lista de pestañas con su nombre', () => {
    const { element, tabs } = setup();
    expect(element.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Reportes');
    expect(tabs().map((tab) => tab.textContent?.trim())).toEqual(['Ventas', 'Stock', 'Pagos']);
  });

  it('marca la elegida y solo esa entra con Tab', () => {
    const { tabs } = setup('stock');
    expect(tabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('sin ninguna elegida, con Tab se entra por la primera', () => {
    expect(setup('').tabs()[0].tabIndex).toBe(0);
  });

  it('cada pestaña apunta a su panel, y el panel a su pestaña', () => {
    const { element, tabs } = setup();
    const panel = element.querySelector('[role="tabpanel"]')!;
    expect(tabs()[0].getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs()[0].id);
  });

  it('un clic cambia de pestaña', () => {
    const { fixture, tabs } = setup();
    tabs()[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('payments');
  });

  it('con las flechas se pasa a la vecina, que queda con el foco', () => {
    const { fixture, tabs, press } = setup();
    press(0, 'ArrowRight');
    expect(fixture.componentInstance.value()).toBe('stock');
    expect(document.activeElement).toBe(tabs()[1]);
    press(1, 'End');
    expect(fixture.componentInstance.value()).toBe('payments');
    press(2, 'ArrowRight');
    expect(fixture.componentInstance.value()).toBe('sales');
  });

  it('la puntada es solo dibujo', () => {
    expect(setup().element.querySelector('.thread')?.getAttribute('aria-hidden')).toBe('true');
  });
});
