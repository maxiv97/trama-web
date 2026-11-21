import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PersonCell } from '../../../../../src/app/shared/components/table/person-cell';

function render(verified?: 'verified' | 'pending') {
  const fixture = TestBed.createComponent(PersonCell);
  fixture.componentRef.setInput('name', 'Lucía Fernández');
  fixture.componentRef.setInput('meta', 'DNI 30.456.789');
  if (verified) fixture.componentRef.setInput('verified', verified);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PersonCell', () => {
  it('la burbuja lleva las iniciales, y al lado el nombre y su dato', () => {
    const host = render();
    expect(host.querySelector('app-blob-icon .initials')?.textContent?.trim()).toBe('LF');
    expect(host.querySelector('.name')?.textContent?.trim()).toBe('Lucía Fernández');
    expect(host.querySelector('.trama-table__meta')?.textContent?.trim()).toBe('DNI 30.456.789');
  });

  it('verificada: la burbuja lleva el sello y el lector lo escucha', () => {
    const host = render('verified');
    expect(host.querySelector('app-verified-seal')).not.toBeNull();
    expect(host.querySelector('.sr-only')?.textContent?.trim()).toBe('(verificado)');
  });

  it('sin verificar, ni sello ni aviso', () => {
    const host = render();
    expect(host.querySelector('app-verified-seal')).toBeNull();
    expect(host.querySelector('.sr-only')).toBeNull();
  });
});
