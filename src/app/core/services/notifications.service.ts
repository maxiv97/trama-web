import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Notification } from '../models/notification.model';
import { MockStore } from '../mocks/mock-store';
import { mockResponse } from '../mocks/mock-response';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly store = inject(MockStore);

  private readonly items = signal<Notification[]>([...this.store.data.notifications]);
  readonly all = this.items.asReadonly();

  byUser(userId: string): Observable<Notification[]> {
    return mockResponse(this.items().filter((notification) => notification.userId === userId));
  }

  emit(notification: Notification): void {
    this.store.data.notifications.push(notification);
    this.commit();
  }

  create(notification: Notification): Observable<Notification> {
    this.emit(notification);
    return mockResponse(notification);
  }

  markRead(id: string): void {
    const notification = this.store.data.notifications.find((item) => item.id === id);
    if (!notification || notification.read) return;
    notification.read = true;
    this.commit();
  }

  markAllRead(userId: string): void {
    let changed = false;
    for (const notification of this.store.data.notifications) {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        changed = true;
      }
    }
    if (changed) this.commit();
  }

  unreadCountFor(userId: string): number {
    return this.items().filter(
      (notification) => notification.userId === userId && !notification.read,
    ).length;
  }

  private commit(): void {
    this.store.persist();
    this.items.set([...this.store.data.notifications]);
  }
}
