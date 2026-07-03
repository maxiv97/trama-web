import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Notification } from '../models/notification.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly store = inject(MockStore);

  readonly unreadCount = signal(2);

  byUser(userId: string): Observable<Notification[]> {
    return mockResponse(
      this.store.data.notifications.filter((notification) => notification.userId === userId),
    );
  }

  unreadCountFor(userId: string): number {
    return this.store.data.notifications.filter(
      (notification) => notification.userId === userId && !notification.read,
    ).length;
  }
}
