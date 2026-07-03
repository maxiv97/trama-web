import { Injectable } from '@angular/core';
import { Consignor, Merchant } from '../models/user.model';
import { Garment } from '../models/garment.model';
import { Proposal } from '../models/proposal.model';
import { Agreement } from '../models/agreement.model';
import { Reception } from '../models/reception.model';
import { Sale } from '../models/sale.model';
import { Payout } from '../models/payout.model';
import { Notification } from '../models/notification.model';
import { CONSIGNORS } from './consignors.mock';
import { MERCHANTS } from './merchants.mock';
import { GARMENTS } from './garments.mock';
import { PROPOSALS } from './proposals.mock';
import { PAYOUTS } from './payouts.mock';
import { NOTIFICATIONS } from './notifications.mock';

export interface MockData {
  consignors: Consignor[];
  merchants: Merchant[];
  garments: Garment[];
  proposals: Proposal[];
  agreements: Agreement[];
  receptions: Reception[];
  sales: Sale[];
  payouts: Payout[];
  notifications: Notification[];
}

const STORAGE_KEY = 'trama.mockdb';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function seed(): MockData {
  return structuredClone({
    consignors: CONSIGNORS,
    merchants: MERCHANTS,
    garments: GARMENTS,
    proposals: PROPOSALS,
    agreements: [] as Agreement[],
    receptions: [] as Reception[],
    sales: [] as Sale[],
    payouts: PAYOUTS,
    notifications: NOTIFICATIONS,
  });
}

@Injectable({ providedIn: 'root' })
export class MockStore {
  private state = this.load();

  get data(): MockData {
    return this.state;
  }

  persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  reset(): void {
    this.state = seed();
    this.persist();
  }

  private load(): MockData {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return JSON.parse(raw, (_key, value) =>
      typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value,
    ) as MockData;
  }
}
