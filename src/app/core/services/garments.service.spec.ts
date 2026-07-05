import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GarmentsService } from './garments.service';
import { MockStore } from '../mocks/mock-store';

describe('GarmentsService.applyAction', () => {
  let service: GarmentsService;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GarmentsService);
    store = TestBed.inject(MockStore);
    store.reset();
  });

  it('advances the status via the state machine and appends a timeline event', () => {
    const before = store.data.garments.find((garment) => garment.id === 'gar-4')!;
    const timelineLength = before.timeline.length;

    service.applyAction('gar-4', 'ACCEPT_COUNTEROFFER', 'consignor', 'Aceptada');

    const after = store.data.garments.find((garment) => garment.id === 'gar-4')!;
    expect(after.status).toBe('agreed');
    expect(after.timeline.length).toBe(timelineLength + 1);
    expect(after.timeline.at(-1)).toMatchObject({
      actor: 'consignor',
      status: 'agreed',
      note: 'Aceptada',
    });
  });

  it('throws on an invalid transition for the current status', () => {
    expect(() => service.applyAction('gar-2', 'ACCEPT_COUNTEROFFER', 'consignor')).toThrow();
  });
});
