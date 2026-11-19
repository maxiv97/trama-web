import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { catchError, filter, map, of, switchMap } from 'rxjs';
import { Bell, LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { UserMenu } from '../user-menu/user-menu';
import { SideNav } from './side-nav';
import { BottomNav } from './bottom-nav';
import { NAV_ITEMS, NavItem } from './nav-items';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, LucideAngularModule, UserMenu, SideNav, BottomNav],
  template: `
    <div [class]="isPublic() ? '' : 'min-h-screen bg-trama-sand-50'">
      @if (!isPublic()) {
        <aside class="fixed inset-y-0 left-0 z-40 hidden w-60 md:flex">
          <app-side-nav
            class="flex-1"
            [items]="menu()"
            [role]="currentRole()"
            [unread]="unread()"
          />
        </aside>
      }

      @if (!isPublic()) {
        <header
          class="sticky top-0 z-30 flex items-center justify-end gap-2 border-b border-trama-sand-100 bg-trama-paper px-4 py-2.5 md:ml-60 md:px-8"
        >
          <a
            [routerLink]="notificationsLink()"
            class="relative flex h-11 w-11 items-center justify-center rounded-xl text-trama-body transition-colors hover:bg-trama-sand-50 hover:text-trama-dark"
          >
            <lucide-angular [img]="bellIcon" [size]="20" />
            @if (unread()) {
              <span
                class="absolute right-1 top-1 min-w-5 rounded-full bg-trama-knot px-1 text-center text-xs font-bold text-trama-dark"
                aria-hidden="true"
                >{{ unread() }}</span
              >
            }
            <span class="sr-only"
              >Notificaciones{{ unread() ? ', ' + unread() + ' sin leer' : '' }}</span
            >
          </a>
          <app-user-menu [name]="currentUserName()" [role]="currentRole()" (logout)="logout()" />
        </header>
      }

      <div [class]="isPublic() ? '' : 'px-4 py-6 pb-24 md:ml-60 md:px-8 md:pb-6'">
        <ng-content />
      </div>

      @if (!isPublic()) {
        <app-bottom-nav class="md:hidden" [items]="menu()" [unread]="unread()" />
      }
    </div>
  `,
})
export class Shell {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationsService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isPublic = computed(() => {
    const url = this.url();
    return url === '/' || url.startsWith('/login') || url.startsWith('/register');
  });

  protected readonly currentRole = computed(() => this.auth.role());
  protected readonly currentUserName = computed(() => this.auth.user()?.name ?? '');

  protected readonly menu = computed<NavItem[]>(() => {
    const role = this.auth.role();
    return role ? NAV_ITEMS[role] : [];
  });

  protected readonly notificationsLink = computed(() =>
    this.auth.role() === 'merchant' ? '/m/notifications' : '/c/notifications',
  );

  private readonly unreadSource = computed(() => ({
    userId: this.auth.user()?.id ?? null,
    url: this.url(),
  }));

  protected readonly unread = toSignal(
    toObservable(this.unreadSource).pipe(
      switchMap(({ userId }) =>
        userId ? this.notifications.unreadCountFor(userId).pipe(catchError(() => of(0))) : of(0),
      ),
    ),
    { initialValue: 0 },
  );
  protected readonly bellIcon = Bell;

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
