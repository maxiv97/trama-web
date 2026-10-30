import { describe, expect, it } from 'vitest';
import { distanceKm } from './geo.util';

describe('distanceKm', () => {
  it('returns zero for the same point', () => {
    const point = { lat: -31.4281, lng: -64.1888 };
    expect(distanceKm(point, point)).toBe(0);
  });

  it('measures the distance between Nueva Córdoba and Cerro de las Rosas', () => {
    const nuevaCordoba = { lat: -31.4281, lng: -64.1888 };
    const cerro = { lat: -31.3605, lng: -64.2456 };
    expect(distanceKm(nuevaCordoba, cerro)).toBeCloseTo(9.3, 0);
  });

  it('is symmetric', () => {
    const a = { lat: -31.4281, lng: -64.1888 };
    const b = { lat: -31.4256, lng: -64.195 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 5);
  });
});
