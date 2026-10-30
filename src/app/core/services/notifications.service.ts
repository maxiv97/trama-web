import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notifications`;

  byUser(_userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.base);
  }

  unreadCountFor(_userId: string): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.base}/unread-count`)
      .pipe(map((response) => response.count));
  }

  markRead(id: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.base}/${id}/read`, {});
  }

  markAllRead(_userId: string): Observable<unknown> {
    return this.http.patch(`${this.base}/read-all`, {});
  }
}
