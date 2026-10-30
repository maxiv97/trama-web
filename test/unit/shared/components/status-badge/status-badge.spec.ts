import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '../../../../../src/app/shared/components/status-badge/status-badge';

describe('StatusBadge', () => {
  it('renderiza el label en español del status', () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', 'in_stock');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent?.trim();
    expect(text).toBe('En stock');
  });

  it('refleja el cambio de status', () => {
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('status', 'sold');
    fixture.detectChanges();

    fixture.componentRef.setInput('status', 'no_agreement');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent?.trim();
    expect(text).toBe('Sin acuerdo');
  });
});
