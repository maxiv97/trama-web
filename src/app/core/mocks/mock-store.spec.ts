import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MockStore } from './mock-store';

describe('MockStore', () => {
  beforeEach(() => localStorage.clear());

  it('siembra los datos iniciales', () => {
    const store = TestBed.inject(MockStore);
    expect(store.data.merchants.length).toBe(2);
    expect(store.data.garments.length).toBe(6);
    expect(store.data.proposals.length).toBe(4);
  });

  it('revive las fechas como instancias de Date', () => {
    const store = TestBed.inject(MockStore);
    expect(store.data.garments[0].createdAt).toBeInstanceOf(Date);
  });

  it('persiste cambios y resetea al seed', () => {
    const store = TestBed.inject(MockStore);
    store.data.garments.push({ ...store.data.garments[0], id: 'temp' });
    store.persist();
    expect(store.data.garments.some((garment) => garment.id === 'temp')).toBe(true);

    store.reset();
    expect(store.data.garments.some((garment) => garment.id === 'temp')).toBe(false);
    expect(store.data.garments.length).toBe(6);
  });
});
