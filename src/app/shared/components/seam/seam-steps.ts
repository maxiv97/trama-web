import { SeamOutcome, SeamStepState } from './seam-button';

export function stepState(index: number, current: number, outcome: SeamOutcome): SeamStepState {
  if (index < current) return 'done';
  if (index > current) return 'pending';
  return outcome === 'complete' ? 'done' : 'current';
}

export function sewnUntil(current: number, outcome: SeamOutcome): number {
  return outcome === 'open' ? Math.max(current - 1, 0) : current;
}

export function stepStatusText(index: number, current: number, outcome: SeamOutcome): string {
  if (index === current) {
    if (outcome === 'complete') return '(completado)';
    if (outcome === 'negative') return '(se cerró en este paso)';
    return '(paso actual)';
  }
  return index < current ? '(hecho)' : '(pendiente)';
}
