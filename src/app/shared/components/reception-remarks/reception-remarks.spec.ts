import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Reception } from '../../../core/models/reception.model';
import { ReceptionRemarks } from './reception-remarks';

function makeReception(overrides: Partial<Reception> = {}): Reception {
  return {
    id: 'rec-1',
    garmentId: 'gar-1',
    receivedAt: new Date('2026-06-01'),
    salesPointId: 'sp-1',
    result: 'with_remarks',
    discrepancies: [],
    evidence: [],
    receiptNumber: 'REC-1',
    handledBy: 'Comercio',
    ...overrides,
  };
}

describe('ReceptionRemarks', () => {
  it('renderiza los labels en español de las discrepancias', () => {
    const fixture = TestBed.createComponent(ReceptionRemarks);
    fixture.componentRef.setInput(
      'reception',
      makeReception({ discrepancies: ['condition', 'hygiene'] }),
    );
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Condición inferior');
    expect(text).toContain('Sin higienizar');
  });

  it('muestra el detalle cuando está presente', () => {
    const fixture = TestBed.createComponent(ReceptionRemarks);
    fixture.componentRef.setInput(
      'reception',
      makeReception({ detail: 'La manga tiene una mancha.' }),
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'La manga tiene una mancha.',
    );
  });

  it('sin discrepancias ni detalle no renderiza chips ni párrafos', () => {
    const fixture = TestBed.createComponent(ReceptionRemarks);
    fixture.componentRef.setInput('reception', makeReception());
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('li')).toBeNull();
    expect(host.querySelector('p')).toBeNull();
  });
});
