import { DestroyRef, inject, Signal, signal } from '@angular/core';

export const NARROW_SCREEN = '(width < 48rem)';

// Detecta si todavia aplica un media query
export function mediaQuery(query: string): Signal<boolean> {
  // Donde no existe matchMedia se toma la pantalla sin media query
  if (typeof window.matchMedia !== 'function') return signal(false).asReadonly();

  const list = window.matchMedia(query);
  const matches = signal(list.matches);
  const follow = (event: MediaQueryListEvent) => matches.set(event.matches);
  list.addEventListener('change', follow);
  inject(DestroyRef).onDestroy(() => list.removeEventListener('change', follow));
  return matches.asReadonly();
}
