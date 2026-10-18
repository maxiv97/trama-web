import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  ArrowLeftRight,
  Bell,
  Check,
  Handshake,
  Inbox,
  LucideAngularModule,
  LucideIconData,
  Receipt,
} from 'lucide-angular';
import { BlobIcon } from '../blob-icon/blob-icon';
import { EnterDirective } from '../../directives/enter.directive';
import { BlobTone, Hanger } from '../../icons/trama-icons';
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

/** Ícono y blob por tipo (handoff §4.17). */
const TYPE_KIND: Record<NotificationType, { icon: LucideIconData; tone: BlobTone; label: string }> = {
  proposal: { icon: Inbox, tone: 'gold', label: 'Propuesta' },
  counteroffer: { icon: ArrowLeftRight, tone: 'warning', label: 'Contraoferta' },
  agreement: { icon: Handshake, tone: 'success', label: 'Acuerdo' },
  reception: { icon: Hanger, tone: 'cream', label: 'Recepción' },
  sale: { icon: Receipt, tone: 'success', label: 'Venta' },
  payout: { icon: Check, tone: 'sage', label: 'Pago' },
};

@Component({
  selector: 'app-notification-list',
  imports: [BlobIcon, EnterDirective, PageSkeleton, PageHeader, LucideAngularModule, ShortDatePipe, ErrorState, EmptyState],
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
              class="t-btn t-btn-ghost t-btn-sm"
            >
              Marcar todas como leídas
            </button>
          }
        </app-page-header>

        @if (notifications.length) {
          <ul class="t-card divide-y divide-trama-sand-100 p-2 sm:p-3">
            @for (notification of notifications; track notification.id; let i = $index) {
              <li [appEnter]="i">
                <button
                  type="button"
                  (click)="open(notification)"
                  class="flex w-full items-center gap-4 rounded-[14px] px-3 py-3.5 text-left transition-colors duration-150 hover:bg-trama-sand-50"
                >
                  <app-blob-icon
                    [icon]="kind(notification.type).icon"
                    [tone]="kind(notification.type).tone"
                    [size]="42"
                    [iconSize]="20"
                    [rotate]="(i % 4) * 25 - 30"
                    [class.opacity-70]="notification.read"
                  />
                  <span class="min-w-0 flex-1" [class.opacity-70]="notification.read">
                    <span class="block text-[15px] leading-snug text-trama-dark" [class]="notification.read ? 'font-medium' : 'font-bold'">{{ notification.text }}</span>
                    <span class="mt-0.5 block text-[13px] text-trama-muted">{{ kind(notification.type).label }} · {{ notification.date | shortDate }}</span>
                  </span>
                  @if (!notification.read) {
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-trama-knot" aria-label="Sin leer"></span>
                  }
                </button>
              </li>
            }
          </ul>
        } @else {
          <app-empty-state [icon]="headerIcon" title="No tenés notificaciones" message="Cuando haya novedades sobre tus prendas, propuestas o pagos, te avisamos acá." />
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

  protected kind(type: NotificationType): { icon: LucideIconData; tone: BlobTone; label: string } {
    return TYPE_KIND[type];
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
