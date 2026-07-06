import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationList } from '../../../shared/components/notification-list/notification-list';

@Component({
  selector: 'app-consignor-notifications',
  imports: [NotificationList],
  template: `<app-notification-list [userId]="auth.user()!.id" />`,
})
export class ConsignorNotifications {
  protected readonly auth = inject(AuthService);
}
