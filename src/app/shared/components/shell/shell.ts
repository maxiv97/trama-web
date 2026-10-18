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
import { BlobIcon } from '../blob-icon/blob-icon';
import { Hanger } from '../../icons/trama-icons';

interface NavItem {
  label: string;
  link: string;
  icon: LucideIconData;
  exact?: boolean;
  badge?: boolean;
  /** Etiqueta corta para la barra inferior del celular. */
  short?: string;
}

const MENUS: Record<Role, NavItem[]> = {
  consignor: [
    { label: 'Mi panel', link: '/c', icon: LayoutDashboard, exact: true, short: 'Panel' },
    { label: 'Mis liquidaciones', link: '/c/payouts', icon: Receipt, short: 'Liquidaciones' },
    { label: 'Notificaciones', link: '/c/notifications', icon: Bell, badge: true, short: 'Avisos' },
  ],
  merchant: [
    { label: 'Panel', link: '/m', icon: LayoutDashboard, exact: true },
    { label: 'Propuestas', link: '/m/proposals', icon: Inbox },
    { label: 'Inventario', link: '/m/inventory', icon: Hanger },
    { label: 'Liquidaciones', link: '/m/payouts', icon: Receipt, short: 'Pagos' },
    { label: 'Reportes', link: '/m/reports', icon: BarChart3 },
    { label: 'Mis cedentes', link: '/m/consignors', icon: Users, short: 'Cedentes' },
    { label: 'Puntos de venta', link: '/m/sales-points', icon: MapPin, short: 'Puntos' },
    { label: 'Categorías', link: '/m/categories', icon: Tags },
    { label: 'Configuración', link: '/m/settings', icon: Settings, short: 'Ajustes' },
    { label: 'Notificaciones', link: '/m/notifications', icon: Bell, badge: true, short: 'Avisos' },
  ],
};

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, LogoIcon, UserMenu, BlobIcon],
  template: `
    <div [class]="isPublic() ? '' : 'min-h-screen bg-trama-sand-50'">
      @if (!isPublic()) {
        <aside class="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-trama-sidebar md:flex">
          <a routerLink="/" class="flex items-center gap-2.5 px-6 pb-6 pt-6">
            <app-logo-icon [size]="28" />
            <span class="font-display text-[22px] font-bold tracking-[-0.02em] text-trama-sand-50">Trama</span>
          </a>
          <nav class="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
            @for (item of menu(); track item.link) {
              <a
                [routerLink]="item.link"
                routerLinkActive
                #rla="routerLinkActive"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                class="group flex items-center gap-3 rounded-xl px-2.5 py-[7px] text-sm transition-colors duration-150"
                [class]="
                  rla.isActive
                    ? 'bg-[rgba(246,240,226,.08)] font-bold text-trama-sand-50'
                    : 'font-medium text-[rgba(246,240,226,.72)] hover:bg-[rgba(246,240,226,.05)] hover:text-trama-sand-50'
                "
              >
                <app-blob-icon
                  class="nav-blob"
                  [class.nav-blob-on]="rla.isActive"
                  [icon]="item.icon"
                  [size]="32"
                  [iconSize]="20"
                  [tone]="rla.isActive ? 'gold' : 'transparent'"
                  [iconColor]="rla.isActive ? '#1F3A2B' : 'currentColor'"
                />
                <span class="truncate">{{ item.label }}</span>
                @if (item.badge && unread()) {
                  <span
                    class="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-trama-knot px-1.5 text-xs font-bold leading-5 text-trama-paper"
                    >{{ unread() }}</span
                  >
                }
              </a>
            }
          </nav>
        </aside>
      }

      @if (!isPublic()) {
        <header
          class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-trama-sand-100 bg-trama-paper/95 px-4 py-2.5 backdrop-blur md:ml-60 md:justify-end md:px-8"
        >
          <a routerLink="/" class="flex items-center gap-2 md:hidden">
            <app-logo-icon [size]="26" />
            <span class="font-display text-lg font-bold text-trama-dark">Trama</span>
          </a>
          <div class="flex items-center gap-2">
            <a
              [routerLink]="notificationsLink()"
              class="relative hidden h-10 w-10 items-center justify-center rounded-xl text-trama-body hover:bg-trama-sand-50 hover:text-trama-dark md:flex"
              aria-label="Notificaciones"
            >
              <lucide-angular [img]="bellIcon" [size]="20" />
              @if (unread()) {
                <span
                  class="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full border-2 border-trama-paper bg-trama-knot px-1 text-[11px] font-bold leading-[14px] text-trama-paper"
                  >{{ unread() }}</span
                >
              }
            </a>
            <app-user-menu
              [userId]="currentUserId()"
              [name]="currentUserName()"
              [role]="currentRole()"
              (logout)="logout()"
            />
          </div>
        </header>
      }

      <div [class]="isPublic() ? '' : 'px-4 py-6 pb-28 md:ml-60 md:px-10 md:py-9 md:pb-10'">
        <div [class]="isPublic() ? '' : 'mx-auto max-w-[1240px]'">
          <ng-content />
        </div>
      </div>

      @if (!isPublic()) {
        <nav
          class="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-trama-sand-100 bg-trama-paper pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          @for (item of mobileMenu(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive
              #mrla="routerLinkActive"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              class="relative flex min-w-[64px] flex-1 flex-col items-center gap-0.5 py-2 text-[11px]"
              [class]="mrla.isActive ? 'font-bold text-trama-dark' : 'font-medium text-trama-muted'"
              [attr.aria-label]="item.label"
            >
              <app-blob-icon
                class="nav-blob"
                [class.nav-blob-on]="mrla.isActive"
                [icon]="item.icon"
                [size]="32"
                [iconSize]="19"
                [tone]="mrla.isActive ? 'gold' : 'transparent'"
                [iconColor]="mrla.isActive ? '#1F3A2B' : 'currentColor'"
              />
              <span class="max-w-full truncate px-1">{{ item.short ?? item.label }}</span>
              @if (item.badge && unread()) {
                <span class="absolute right-[24%] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-trama-paper bg-trama-knot"></span>
              }
            </a>
          }
        </nav>
      }
    </div>
  `,
  styles: `
    .nav-blob ::ng-deep > svg {
      transition: transform 400ms cubic-bezier(0.3, 1.4, 0.5, 1);
      transform: scale(0.4);
    }
    .nav-blob-on ::ng-deep > svg {
      transform: scale(1);
    }
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
  protected readonly currentUserId = computed(() => this.auth.user()?.id ?? '');

  protected readonly menu = computed<NavItem[]>(() => {
    const role = this.auth.role();
    return role ? MENUS[role] : [];
  });

  protected readonly mobileMenu = this.menu;

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
