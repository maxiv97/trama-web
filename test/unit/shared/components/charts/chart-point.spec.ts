import { describe, expect, it } from 'vitest';
import { proportions } from '../../../../../src/app/shared/components/charts/chart-point';

describe('proportions', () => {
  it('cada valor se mide contra el mayor', () => {
    expect(
      proportions([
        { label: 'a', value: 50 },
        { label: 'b', value: 100 },
      ]),
    ).toEqual([0.5, 1]);
  });

  it('un valor chico pero positivo no desaparece', () => {
    expect(
      proportions([
        { label: 'a', value: 1 },
        { label: 'b', value: 1000 },
      ])[0],
    ).toBe(0.04);
  });

  it('cero queda en cero, y si todo es cero no divide por cero', () => {
    expect(
      proportions([
        { label: 'a', value: 0 },
        { label: 'b', value: 10 },
      ])[0],
    ).toBe(0);
    expect(proportions([{ label: 'a', value: 0 }])).toEqual([0]);
  });
});
