import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import {
  Bell,
  LayoutDashboard,
  LogOut,
  LucideAngularModule,
  LucideIconData,
  MapPin,
  Package,
  Receipt,
  Settings,
  Users,
} from 'lucide-angular';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { Role } from '../../../core/models/user.model';

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
    { label: 'Inventario', link: '/m/inventory', icon: Package },
    { label: 'Liquidaciones', link: '/m/payouts', icon: Receipt },
    { label: 'Mis cedentes', link: '/m/consignors', icon: Users },
    { label: 'Puntos de venta', link: '/m/sales-points', icon: MapPin },
    { label: 'Configuración', link: '/m/settings', icon: Settings },
    { label: 'Notificaciones', link: '/m/notifications', icon: Bell, badge: true },
  ],
};

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div [class]="isPublic() ? '' : 'min-h-screen bg-trama-sand-50'">
      @if (!isPublic()) {
        <aside
          class="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-trama-sand-200 bg-white md:flex"
        >
          <div class="px-6 py-5 text-2xl font-semibold text-trama-brand">Trama</div>
          <nav class="flex-1 space-y-1 px-3">
            @for (item of menu(); track item.link) {
              <a
                [routerLink]="item.link"
                routerLinkActive="bg-trama-green-50 text-trama-brand"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-trama-dark/70 hover:bg-trama-sand-100"
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
          <button
            type="button"
            (click)="logout()"
            class="m-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-trama-dark/60 hover:bg-trama-sand-100"
          >
            <lucide-angular [img]="logoutIcon" [size]="20" />
            <span>Salir</span>
          </button>
        </aside>
      }

      <div [class]="isPublic() ? '' : 'px-4 py-6 pb-24 md:ml-60 md:px-8 md:pb-6'">
        <ng-content />
      </div>

      @if (!isPublic()) {
        <nav
          class="fixed inset-x-0 bottom-0 z-40 flex border-t border-trama-sand-200 bg-white md:hidden"
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
    return url === '/' || url.startsWith('/login');
  });

  protected readonly menu = computed<NavItem[]>(() => {
    const role = this.auth.role();
    return role ? MENUS[role] : [];
  });

  protected readonly unread = this.notifications.unreadCount;
  protected readonly logoutIcon = LogOut;

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
