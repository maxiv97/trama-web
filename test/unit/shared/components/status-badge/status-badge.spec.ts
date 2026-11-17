import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GarmentStatus } from '../../../../../src/app/core/models/garment.model';
import { StatusBadge } from '../../../../../src/app/shared/components/status-badge/status-badge';

function render(status: GarmentStatus) {
  const fixture = TestBed.createComponent(StatusBadge);
  fixture.componentRef.setInput('status', status);
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('StatusBadge', () => {
  it('renderiza el label en español del status', () => {
    expect(render('in_stock').host.textContent?.trim()).toBe('En stock');
  });

  it('refleja el cambio de status', () => {
    const { fixture, host } = render('sold');
    fixture.componentRef.setInput('status', 'no_agreement');
    fixture.detectChanges();
    expect(host.textContent?.trim()).toBe('Sin acuerdo');
    expect(host.classList.contains('trama-badge--none')).toBe(true);
    expect(host.classList.contains('trama-badge--sold')).toBe(false);
  });

  it('es la pill .trama-badge, sin un elemento de más adentro', () => {
    const { host } = render('agreed');
    expect(host.classList.contains('trama-badge')).toBe(true);
    expect(host.children).toHaveLength(0);
  });

  it('cada estado usa el color de su familia', () => {
    const cases: [GarmentStatus, string][] = [
      ['under_review', 'trama-badge--pending'],
      ['with_remarks', 'trama-badge--pending'],
      ['counteroffer', 'trama-badge--counter'],
      ['agreed', 'trama-badge--agreed'],
      ['in_stock', 'trama-badge--agreed'],
      ['sold', 'trama-badge--sold'],
      ['paid_out', 'trama-badge--settled'],
      ['rejected', 'trama-badge--none'],
      ['cancelled', 'trama-badge--none'],
    ];
    for (const [status, modifier] of cases) {
      expect(render(status).host.classList.contains(modifier)).toBe(true);
    }
  });

  it('recién enviada va en el neutral, sin modificador', () => {
    const { host } = render('submitted');
    expect(host.className.trim()).toBe('trama-badge');
  });
});
