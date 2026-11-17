import { describe, expect, it } from 'vitest';
import {
  sewnUntil,
  stepState,
  stepStatusText,
} from '../../../../../src/app/shared/components/seam/seam-steps';

describe('seam-steps', () => {
  it('antes del paso actual está hecho, después pendiente', () => {
    expect([0, 1, 2, 3].map((i) => stepState(i, 2, 'open'))).toEqual([
      'done',
      'done',
      'current',
      'pending',
    ]);
  });

  it('el paso donde terminó: hecho si fue el final natural, actual si se cerró en negativo', () => {
    expect(stepState(6, 6, 'complete')).toBe('done');
    expect(stepState(1, 1, 'negative')).toBe('current');
  });

  it('abierto, el hilo cosido llega al último paso hecho; terminado, al paso final', () => {
    expect(sewnUntil(3, 'open')).toBe(2);
    expect(sewnUntil(0, 'open')).toBe(0);
    expect(sewnUntil(3, 'negative')).toBe(3);
    expect(sewnUntil(6, 'complete')).toBe(6);
  });

  it('el lector escucha el estado de cada paso y cómo terminó el proceso', () => {
    expect(stepStatusText(0, 2, 'open')).toBe('(hecho)');
    expect(stepStatusText(2, 2, 'open')).toBe('(paso actual)');
    expect(stepStatusText(3, 2, 'open')).toBe('(pendiente)');
    expect(stepStatusText(6, 6, 'complete')).toBe('(completado)');
    expect(stepStatusText(1, 1, 'negative')).toBe('(se cerró en este paso)');
  });
});
