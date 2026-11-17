import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GarmentStatus } from '../../../../../src/app/core/models/garment.model';
import { ProgressTracker } from '../../../../../src/app/shared/components/progress-tracker/progress-tracker';

function render(status: GarmentStatus) {
  const fixture = TestBed.createComponent(ProgressTracker);
  fixture.componentRef.setInput('currentStatus', status);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function currentLabel(host: HTMLElement): string | undefined {
  return host.querySelector('app-seam.wide li[aria-current="step"] .label')?.textContent?.trim();
}

function currentButton(host: HTMLElement): Element | null {
  return host.querySelectorAll('app-seam.wide app-seam-button')[
    Array.from(host.querySelectorAll('app-seam.wide li')).findIndex((li) =>
      li.hasAttribute('aria-current'),
    )
  ];
}

describe('ProgressTracker', () => {
  it('muestra los 7 pasos de la prenda en la costura y el resumen para celular', () => {
    const host = render('submitted');
    expect(host.querySelectorAll('app-seam.wide li')).toHaveLength(7);
    expect(host.querySelector('app-seam-summary.narrow')).not.toBeNull();
  });

  it('ubica cada estado en su paso', () => {
    expect(currentLabel(render('counteroffer'))).toBe('En revisión');
    expect(currentLabel(render('with_remarks'))).toBe('En stock');
    expect(currentLabel(render('sold'))).toBe('Vendida');
  });

  it('liquidada es el final natural: el último paso queda hecho con anillo verde', () => {
    const button = currentButton(render('paid_out'));
    expect(button?.classList.contains('done')).toBe(true);
    expect(button?.classList.contains('complete')).toBe(true);
  });

  it('sin acuerdo, rechazada y cancelada cierran en negativo', () => {
    for (const status of ['no_agreement', 'rejected', 'cancelled'] as const) {
      expect(currentButton(render(status))?.classList.contains('negative')).toBe(true);
    }
  });

  it('mientras avanza, el paso actual no está cerrado', () => {
    const button = currentButton(render('in_stock'));
    expect(button?.classList.contains('negative')).toBe(false);
    expect(button?.classList.contains('complete')).toBe(false);
  });
});
