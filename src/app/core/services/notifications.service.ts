import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  readonly unreadCount = signal(2);
}
