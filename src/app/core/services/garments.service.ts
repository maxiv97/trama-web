import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { EventActor, Garment } from '../models/garment.model';
import { NotificationType } from '../models/notification.model';
import { GarmentAction, transition } from '../state-machine/garment.state-machine';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';
import { NotificationsService } from './notifications.service';

export type NewGarment = Omit<Garment, 'id' | 'status' | 'createdAt' | 'timeline'>;

interface NotificationTemplate {
  type: NotificationType;
  text: (garment: Garment) => string;
}

const ACTION_NOTIFICATION: Partial<Record<GarmentAction, NotificationTemplate>> = {
  COUNTER_OFFER: {
    type: 'counteroffer',
    text: (garment) => `El comercio te hizo una contraoferta por "${garment.name}".`,
  },
  ACCEPT_PROPOSAL: {
    type: 'agreement',
    text: (garment) => `El comercio aceptó tu propuesta de "${garment.name}".`,
  },
  ACCEPT_COUNTEROFFER: {
    type: 'agreement',
    text: (garment) => `El cedente aceptó tu contraoferta de "${garment.name}".`,
  },
  REJECT: {
    type: 'proposal',
    text: (garment) => `El comercio rechazó tu propuesta de "${garment.name}".`,
  },
  RECEIVE_AS_AGREED: {
    type: 'reception',
    text: (garment) => `El comercio recibió "${garment.name}" conforme.`,
  },
  RECEIVE_WITH_REMARKS: {
    type: 'reception',
    text: (garment) => `El comercio recibió "${garment.name}" con observaciones.`,
  },
  REJECT_RECEPTION: {
    type: 'reception',
    text: (garment) => `El comercio rechazó la recepción de "${garment.name}".`,
  },
  REGISTER_SALE: {
    type: 'sale',
    text: (garment) => `¡Vendimos "${garment.name}"!`,
  },
  MARK_PAID_OUT: {
    type: 'payout',
    text: (garment) => `Liquidamos el pago de "${garment.name}".`,
  },
};

@Injectable({ providedIn: 'root' })
export class GarmentsService {
  private readonly store = inject(MockStore);
  private readonly notifications = inject(NotificationsService);

  list(): Observable<Garment[]> {
    return mockResponse(this.store.data.garments);
  }

  create(input: NewGarment): Observable<Garment> {
    const createdAt = new Date();
    const status = transition('submitted', 'SUBMIT_PROPOSAL');
    const garment: Garment = {
      ...input,
      id: `gar-${Date.now()}`,
      status,
      createdAt,
      timeline: [
        { date: createdAt, actor: 'consignor', status: 'submitted' },
        { date: createdAt, actor: 'consignor', status, note: 'Propuesta enviada' },
      ],
    };
    this.store.data.garments.push(garment);
    this.store.persist();
    if (garment.merchantId) {
      this.notifications.emit({
        id: `not-${Date.now()}`,
        userId: garment.merchantId,
        type: 'proposal',
        text: `Nueva propuesta de "${garment.name}" para revisar.`,
        date: createdAt,
        read: false,
        target: `/m/garment/${garment.id}`,
      });
    }
    return mockResponse(garment);
  }

  applyAction(
    id: string,
    action: GarmentAction,
    actor: EventActor,
    note?: string,
  ): Observable<Garment> {
    const garment = this.store.data.garments.find((item) => item.id === id);
    if (!garment) {
      return throwError(() => new Error(`Prenda no encontrada: ${id}`));
    }
    const status = transition(garment.status, action);
    garment.status = status;
    garment.timeline.push({ date: new Date(), actor, status, note });
    this.store.persist();
    this.notify(garment, action, actor);
    return mockResponse(garment);
  }

  getById(id: string): Observable<Garment | undefined> {
    return mockResponse(this.store.data.garments.find((garment) => garment.id === id));
  }

  byConsignor(consignorId: string): Observable<Garment[]> {
    return mockResponse(
      this.store.data.garments.filter((garment) => garment.consignorId === consignorId),
    );
  }

  byMerchant(merchantId: string): Observable<Garment[]> {
    return mockResponse(
      this.store.data.garments.filter((garment) => garment.merchantId === merchantId),
    );
  }

  private notify(garment: Garment, action: GarmentAction, actor: EventActor): void {
    const template = ACTION_NOTIFICATION[action];
    if (!template) return;
    const recipientId = actor === 'merchant' ? garment.consignorId : garment.merchantId;
    if (!recipientId) return;
    const base = actor === 'merchant' ? '/c' : '/m';
    this.notifications.emit({
      id: `not-${Date.now()}`,
      userId: recipientId,
      type: template.type,
      text: template.text(garment),
      date: new Date(),
      read: false,
      target: `${base}/garment/${garment.id}`,
    });
  }
}
