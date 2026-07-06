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
  ShoppingBag,
} from 'lucide-angular';
import { BehaviorSubject, catchError, combineLatest, map, Observable, of, startWith, switchMap } from 'rxjs';
import { Notification, NotificationType } from '../../../core/models/notification.model';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ShortDatePipe } from '../../pipes/short-date.pipe';

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
  imports: [LucideAngularModule, ShortDatePipe],
  template: `
    @if (isLoading()) {
      <div class="flex min-h-[60vh] items-center justify-center">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-trama-sand-200 border-t-trama-brand"
        ></div>
      </div>
    } @else if (isError()) {
      <div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p class="text-trama-dark/70">No pudimos cargar las notificaciones.</p>
        <button
          type="button"
          (click)="retry()"
          class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
        >
          Reintentar
        </button>
      </div>
    } @else if (data(); as notifications) {
      <div class="space-y-6">
        <div class="flex items-center justify-between gap-4">
          <h1 class="text-2xl font-semibold text-trama-dark">Notificaciones</h1>
          @if (hasUnread()) {
            <button
              type="button"
              (click)="markAll()"
              class="text-sm font-medium text-trama-brand hover:underline"
            >
              Marcar todas como leídas
            </button>
          }
        </div>

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
          <div
            class="rounded-2xl border border-dashed border-trama-sand-200 py-16 text-center text-trama-dark/60"
          >
            No tenés notificaciones.
          </div>
        }
      </div>
    }
  `,
})
export class NotificationList {
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
    this.notifications.markRead(notification.id);
    this.router.navigateByUrl(notification.target);
  }

  protected markAll(): void {
    this.notifications.markAllRead(this.userId());
    this.reload.next();
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
