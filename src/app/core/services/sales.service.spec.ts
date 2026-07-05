import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { SalesService } from './sales.service';
import { MockStore } from '../mocks/mock-store';

describe('SalesService.markPaid', () => {
  let service: SalesService;
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SalesService);
    store = TestBed.inject(MockStore);
    store.reset();
  });

  it('records payment details on the sale of a garment', async () => {
    const sale = await firstValueFrom(
      service.markPaid('gar-3', { paymentMethod: 'transfer', receiptNumber: 'A-123' }),
    );

    expect(sale.paymentMethod).toBe('transfer');
    expect(sale.receiptNumber).toBe('A-123');
    expect(sale.paidAt).toBeInstanceOf(Date);

    const persisted = store.data.sales.find((item) => item.garmentId === 'gar-3');
    expect(persisted?.paymentMethod).toBe('transfer');
  });

  it('errors when the garment has no sale', async () => {
    await expect(
      firstValueFrom(service.markPaid('gar-1', { paymentMethod: 'cash' })),
    ).rejects.toThrow();
  });
});
