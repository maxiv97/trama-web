import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { VerifiedBadge } from '../../../../../src/app/shared/components/verified/verified-badge';

describe('VerifiedBadge', () => {
  it('es el sello de 18 px con el texto, que es lo que lee el lector', () => {
    const fixture = TestBed.createComponent(VerifiedBadge);
    fixture.componentRef.setInput('label', 'Comercio verificado');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent?.trim()).toBe('Comercio verificado');
    const seal = host.querySelector('app-verified-seal');
    expect(seal?.querySelector('svg')?.getAttribute('width')).toBe('18');
    expect(seal?.getAttribute('aria-hidden')).toBe('true');
  });

  it('por defecto dice "Verificado"; en verificación cambia de color y de sello', () => {
    const fixture = TestBed.createComponent(VerifiedBadge);
    fixture.componentRef.setInput('state', 'pending');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent?.trim()).toBe('Verificado');
    expect(host.classList.contains('pending')).toBe(true);
    expect(host.querySelector('.basted')).not.toBeNull();
  });
});
