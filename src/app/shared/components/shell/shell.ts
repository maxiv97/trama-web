import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, filter, map, of, switchMap } from 'rxjs';
import {
  BarChart3,
  Bell,
  Inbox,
  LayoutDashboard,
  LucideAngularModule,
  LucideIconData,
  MapPin,
  Package,
  Receipt,
  Settings,
  Tags,
  Users,
} from 'lucide-angular';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { Role } from '../../../core/models/user.model';
import { LogoIcon } from '../logo/logo';
import { UserMenu } from '../user-menu/user-menu';

interface NavItem {
  label: string;
  link: string;
  icon: LucideIconData;
  exact?: boolean;
  badge?: boolean;
}

const MENUS: Record<Role, NavItem[]> = {
  consignor: [
    { label: 'Mi panel', link: '/c', icon: LayoutDashboard, exact: true },
    { label: 'Mis liquidaciones', link: '/c/payouts', icon: Receipt },
    { label: 'Notificaciones', link: '/c/notifications', icon: Bell, badge: true },
  ],
  merchant: [
    { label: 'Panel', link: '/m', icon: LayoutDashboard, exact: true },
    { label: 'Propuestas', link: '/m/proposals', icon: Inbox },
    { label: 'Inventario', link: '/m/inventory', icon: Package },
    { label: 'Liquidaciones', link: '/m/payouts', icon: Receipt },
    { label: 'Reportes', link: '/m/reports', icon: BarChart3 },
    { label: 'Mis cedentes', link: '/m/consignors', icon: Users },
    { label: 'Puntos de venta', link: '/m/sales-points', icon: MapPin },
    { label: 'Categorías', link: '/m/categories', icon: Tags },
    { label: 'Configuración', link: '/m/settings', icon: Settings },
    { label: 'Notificaciones', link: '/m/notifications', icon: Bell, badge: true },
  ],
};

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, LogoIcon, UserMenu],
  template: `
    <div [class]="isPublic() ? '' : 'min-h-screen bg-trama-sand-50'">
      @if (!isPublic()) {
        <aside class="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-trama-sidebar md:flex">
          <div class="flex items-center gap-2 px-6 py-5">
            <app-logo-icon [size]="26" />
            <span class="font-display text-xl font-semibold text-white">Trama</span>
          </div>
          <nav class="flex-1 space-y-1 px-3">
            @for (item of menu(); track item.link) {
              <a
                [routerLink]="item.link"
                routerLinkActive="bg-trama-brand text-white"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10"
              >
                <lucide-angular [img]="item.icon" [size]="20" />
                <span>{{ item.label }}</span>
                @if (item.badge && unread()) {
                  <span class="ml-auto rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">{{
                    unread()
                  }}</span>
                }
              </a>
            }
          </nav>
        </aside>
      }

      @if (!isPublic()) {
        <header
          class="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-trama-sand-200 bg-trama-paper px-4 py-3 md:ml-60 md:px-8"
        >
          <a
            [routerLink]="notificationsLink()"
            class="relative hidden items-center justify-center rounded-lg p-2 text-trama-dark/60 hover:bg-trama-sand-100 md:flex"
          >
            <lucide-angular [img]="bellIcon" [size]="20" />
            @if (unread()) {
              <span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
            }
          </a>
          <app-user-menu [name]="currentUserName()" [role]="currentRole()" (logout)="logout()" />
        </header>
      }

      <div [class]="isPublic() ? '' : 'px-4 py-6 pb-24 md:ml-60 md:px-8 md:pb-6'">
        <ng-content />
      </div>

      @if (!isPublic()) {
        <nav
          class="fixed inset-x-0 bottom-0 z-40 flex border-t border-trama-sand-200 bg-trama-paper md:hidden"
        >
          @for (item of menu(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="text-trama-brand"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              class="relative flex flex-1 flex-col items-center py-2 text-trama-dark/60"
            >
              <lucide-angular [img]="item.icon" [size]="22" />
              @if (item.badge && unread()) {
                <span class="absolute right-[28%] top-1 h-2 w-2 rounded-full bg-red-500"></span>
              }
            </a>
          }
        </nav>
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
    return role ? MENUS[role] : [];
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
        userId
          ? this.notifications.unreadCountFor(userId).pipe(catchError(() => of(0)))
          : of(0),
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
