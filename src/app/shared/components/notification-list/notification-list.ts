import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  ArrowLeftRight,
  FileText,
  Handshake,
  LucideAngularModule,
  LucideIconData,
  PackageCheck,
  Receipt,
  ShoppingBag, Bell } from 'lucide-angular';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { Notification, NotificationType } from '../../../core/models/notification.model';
import { NotificationsService } from '../../../core/services/notifications.service';
import { EmptyState } from '../empty-state/empty-state';
import { ErrorState } from '../error-state/error-state';
import { ShortDatePipe } from '../../pipes/short-date.pipe';
import { PageHeader } from '../page-header/page-header';
import { PageSkeleton } from '../page-skeleton/page-skeleton';

type ListState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: Notification[] };

const TYPE_ICON: Record<NotificationType, LucideIconData> = {
  proposal: FileText,
  counteroffer: ArrowLeftRight,
  agreement: Handshake,
  reception: PackageCheck,
  sale: ShoppingBag,
  payout: Receipt,
};

@Component({
  selector: 'app-notification-list',
  imports: [PageSkeleton, PageHeader, LucideAngularModule, ShortDatePipe, ErrorState, EmptyState],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="list" />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar las notificaciones." (retry)="retry()" />
    } @else if (data(); as notifications) {
      <div class="space-y-6">
        <app-page-header title="Notificaciones" section="Notificaciones" [icon]="headerIcon" lead="Lo que pasó con tus prendas, propuestas y pagos.">
          @if (hasUnread()) {
            <button actions
              type="button"
              (click)="markAll()"
              class="text-sm font-medium text-trama-brand hover:underline"
            >
              Marcar todas como leídas
            </button>
          }
        </app-page-header>

        @if (notifications.length) {
          <div class="space-y-2">
            @for (notification of notifications; track notification.id) {
              <button
                type="button"
                (click)="open(notification)"
                class="flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors"
                [class]="
                  notification.read
                    ? 'border-trama-sand-200 bg-white hover:bg-trama-sand-50'
                    : 'border-trama-brand/30 bg-trama-green-50 hover:bg-trama-green-100'
                "
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-trama-sand-100 text-trama-brand"
                >
                  <lucide-angular [img]="icon(notification.type)" [size]="18" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm text-trama-dark">{{ notification.text }}</span>
                  <span class="mt-1 block text-xs text-trama-dark/50">{{
                    notification.date | shortDate
                  }}</span>
                </span>
                @if (!notification.read) {
                  <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-trama-brand"></span>
                }
              </button>
            }
          </div>
        } @else {
          <app-empty-state message="No tenés notificaciones." />
        }
      </div>
    }
  `,
})
export class NotificationList {
  protected readonly headerIcon = Bell;
  private readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly userId = input.required<string>();

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    combineLatest([toObservable(this.userId), this.reload]).pipe(
      switchMap(([userId]) =>
        this.load(userId).pipe(
          map((data): ListState => ({ status: 'loaded', data })),
          startWith<ListState>({ status: 'loading', data: null }),
          catchError((): Observable<ListState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as ListState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly hasUnread = computed(() =>
    (this.data() ?? []).some((notification) => !notification.read),
  );

  protected icon(type: NotificationType): LucideIconData {
    return TYPE_ICON[type];
  }

  protected open(notification: Notification): void {
    this.notifications.markRead(notification.id).subscribe();
    this.router.navigateByUrl(notification.target);
  }

  protected markAll(): void {
    this.notifications.markAllRead(this.userId()).subscribe(() => this.reload.next());
  }

  protected retry(): void {
    this.reload.next();
  }

  private load(userId: string): Observable<Notification[]> {
    return this.notifications
      .byUser(userId)
      .pipe(
        map((list) =>
          [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        ),
      );
  }
}
