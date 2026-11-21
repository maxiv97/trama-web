import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mediaQuery } from '../../../../src/app/shared/utils/media-query';

function fakeMatchMedia(matches: boolean) {
  let listener: ((event: { matches: boolean }) => void) | undefined;
  const list = {
    matches,
    addEventListener: vi.fn((_: string, fn: typeof listener) => (listener = fn)),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(list);
  return { list, change: (next: boolean) => listener?.({ matches: next }) };
}

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

describe('mediaQuery', () => {
  it('sin matchMedia toma la pantalla ancha', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const narrow = runInInjectionContext(TestBed.inject(Injector), () => mediaQuery('(x)'));
    expect(narrow()).toBe(false);
  });

  it('arranca con el valor de la consulta y lo sigue cuando cambia', () => {
    const { change } = fakeMatchMedia(true);
    const narrow = runInInjectionContext(TestBed.inject(Injector), () => mediaQuery('(x)'));
    expect(narrow()).toBe(true);
    change(false);
    expect(narrow()).toBe(false);
  });

  it('deja de escuchar cuando se destruye', () => {
    const { list } = fakeMatchMedia(false);
    runInInjectionContext(TestBed.inject(Injector), () => mediaQuery('(x)'));
    TestBed.resetTestingModule();
    expect(list.removeEventListener).toHaveBeenCalled();
  });
});
