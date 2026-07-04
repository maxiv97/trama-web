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
import { AGREEMENTS } from './agreements.mock';
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
const VERSION_KEY = 'trama.mockdb.version';
const SEED_VERSION = '4';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function seed(): MockData {
  return structuredClone({
    consignors: CONSIGNORS,
    merchants: MERCHANTS,
    garments: GARMENTS,
    proposals: PROPOSALS,
    agreements: AGREEMENTS,
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
    this.write(this.state);
  }

  reset(): void {
    this.state = seed();
    this.write(this.state);
  }

  private write(data: MockData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(VERSION_KEY, SEED_VERSION);
  }

  private load(): MockData {
    const raw = localStorage.getItem(STORAGE_KEY);
    const version = localStorage.getItem(VERSION_KEY);
    if (!raw || version !== SEED_VERSION) {
      const fresh = seed();
      this.write(fresh);
      return fresh;
    }
    return JSON.parse(raw, (_key, value) =>
      typeof value === 'string' && ISO_DATE.test(value) ? new Date(value) : value,
    ) as MockData;
  }
}
