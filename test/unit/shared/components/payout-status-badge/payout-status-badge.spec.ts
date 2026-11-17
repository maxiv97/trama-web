import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PayoutStatus } from '../../../../../src/app/core/models/payout.model';
import { PayoutStatusBadge } from '../../../../../src/app/shared/components/payout-status-badge/payout-status-badge';

function render(status: PayoutStatus) {
  const fixture = TestBed.createComponent(PayoutStatusBadge);
  fixture.componentRef.setInput('status', status);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PayoutStatusBadge', () => {
  it('pendiente, pagada y vencida con su texto y su color', () => {
    const cases: [PayoutStatus, string, string][] = [
      ['pending', 'Pendiente', 'trama-badge--pending'],
      ['paid', 'Pagada', 'trama-badge--agreed'],
      ['overdue', 'Vencida', 'trama-badge--none'],
    ];
    for (const [status, label, modifier] of cases) {
      const host = render(status);
      expect(host.textContent?.trim()).toBe(label);
      expect(host.classList.contains('trama-badge')).toBe(true);
      expect(host.classList.contains(modifier)).toBe(true);
    }
  });
});
