import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '../../../../../app/shared/components/empty-state/empty-state';

describe('EmptyState', () => {
  it('renderiza el mensaje sin CTA por defecto', () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('message', 'No tenés notificaciones.');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent?.trim()).toBe('No tenés notificaciones.');
    expect(host.querySelector('a')).toBeNull();
  });

  it('muestra el CTA cuando hay link', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('message', 'Todavía no cargaste ninguna prenda.');
    fixture.componentRef.setInput('link', '/c/upload');
    fixture.componentRef.setInput('linkLabel', 'Cargá tu primera prenda');
    fixture.detectChanges();

    const anchor = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(anchor?.textContent?.trim()).toBe('Cargá tu primera prenda');
  });
});
