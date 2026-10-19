import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  LucideAngularModule,
  LucideIconData,
  MapPin,
  Receipt,
  Settings,
} from 'lucide-angular';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { Role } from '../../../core/models/user.model';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { Avatar } from '../avatar/avatar';
import { VerifiedChip } from '../verified-badge/verified-badge';

const ROLE_LABELS: Record<Role, string> = {
  consignor: 'Cedente',
  merchant: 'Comercio',
};

interface MenuLink {
  label: string;
  link: string;
  icon: LucideIconData;
}

const LINKS: Record<Role, MenuLink[]> = {
  consignor: [
    { label: 'Mi panel', link: '/c', icon: LayoutDashboard },
    { label: 'Mis liquidaciones', link: '/c/payouts', icon: Receipt },
  ],
  merchant: [
    { label: 'Configuración', link: '/m/settings', icon: Settings },
    { label: 'Puntos de venta', link: '/m/sales-points', icon: MapPin },
  ],
};

interface Profile {
  displayName: string;
  email: string;
  verified: boolean;
}

/**
 * Menú de usuario (handoff §4.16): avatar (cuadrado si es comercio, redondo si
 * es cedente) con el parche de verificado, el nombre y un chevron. El panel
 * muestra nombre, email y el chip de verificado, los accesos con íconos de
 * Lucide entre divisores hilvanados y "Cerrar sesión" en rojo.
 */
@Component({
  selector: 'app-user-menu',
  imports: [LucideAngularModule, RouterLink, Avatar, VerifiedChip],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="open.set(!open())"
        class="flex items-center gap-2.5 rounded-2xl py-1 pl-1 pr-2 transition-colors hover:bg-trama-sand-50"
        [attr.aria-expanded]="open()"
        aria-haspopup="menu"
      >
        <app-avatar [name]="displayName()" [kind]="kind()" [size]="38" [verified]="verifiedBadge()" />
        <span class="hidden min-w-0 text-left md:block">
          <span class="block whitespace-nowrap text-sm font-bold leading-tight text-trama-dark">{{ displayName() }}</span>
          <span class="block text-xs leading-tight text-trama-muted">{{ roleLabel() }}</span>
        </span>
        <lucide-angular
          class="hidden text-trama-dark transition-transform duration-150 md:block"
          [class.rotate-180]="open()"
          [img]="chevron"
          [size]="16"
        />
      </button>

      @if (open()) {
        <div class="fixed inset-0 z-40" (click)="open.set(false)"></div>
        <div
          class="t-popover t-pop-in absolute right-0 top-full z-50 mt-2 w-[260px] rounded-[18px] p-2"
          role="menu"
        >
          <div class="px-3 pb-3 pt-2.5">
            <p class="font-display text-[17px] font-bold leading-tight text-trama-dark">{{ displayName() }}</p>
            @if (profile()?.email; as email) {
              <p class="mt-0.5 truncate text-[13px] text-trama-body">{{ email }}</p>
            }
            @if (profile()?.verified) {
              <app-verified-chip class="mt-2.5" [label]="verifiedLabel()" />
            } @else if (profile()) {
              <span class="mt-2.5 inline-flex rounded-full bg-trama-sand-50 px-3 py-1 text-[13px] font-semibold text-trama-body">
                Verificación pendiente
              </span>
            }
          </div>
          <div class="baste-divider mx-3"></div>
          <div class="py-1.5">
            @for (item of links(); track item.link) {
              <a
                [routerLink]="item.link"
                (click)="open.set(false)"
                role="menuitem"
                class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-trama-dark hover:bg-trama-sand-50"
              >
                <lucide-angular [img]="item.icon" [size]="18" />
                {{ item.label }}
              </a>
            }
          </div>
          <div class="baste-divider mx-3"></div>
          <button
            type="button"
            (click)="onLogout()"
            role="menuitem"
            class="mt-1.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-status-none hover:bg-status-none-soft"
          >
            <lucide-angular [img]="logoutIcon" [size]="18" />
            Cerrar sesión
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .baste-divider {
      height: 2px;
      background-image: linear-gradient(to right, #d6cfbb 8px, transparent 8px);
      background-size: 15px 2px;
      background-repeat: repeat-x;
    }
  `,
})
export class UserMenu {
  private readonly merchants = inject(MerchantsService);
  private readonly consignors = inject(ConsignorsService);

  readonly userId = input('');
  readonly name = input.required<string>();
  readonly role = input.required<Role | null>();
  readonly logout = output<void>();

  protected readonly open = signal(false);
  protected readonly logoutIcon = LogOut;
  protected readonly chevron = ChevronDown;

  private readonly identity = computed(() => ({ id: this.userId(), role: this.role() }));

  protected readonly profile = toSignal(
    toObservable(this.identity).pipe(
      switchMap(({ id, role }) => (id && role ? this.loadProfile(id, role) : of(null))),
    ),
    { initialValue: null },
  );

  protected readonly kind = computed(() => (this.role() === 'merchant' ? 'merchant' : 'consignor'));
  protected readonly displayName = computed(() => this.profile()?.displayName || this.name());
  protected readonly verifiedBadge = computed(() => (this.profile()?.verified ? true : null));
  protected readonly verifiedLabel = computed(() =>
    this.role() === 'merchant' ? 'Comercio verificado' : 'Cedente verificada',
  );
  protected readonly links = computed(() => {
    const role = this.role();
    return role ? LINKS[role] : [];
  });
  protected readonly roleLabel = computed(() => {
    const role = this.role();
    return role ? ROLE_LABELS[role] : '';
  });

  protected onLogout(): void {
    this.open.set(false);
    this.logout.emit();
  }

  private loadProfile(id: string, role: Role): Observable<Profile | null> {
    const source: Observable<Profile> =
      role === 'merchant'
        ? this.merchants.getById(id).pipe(
            map((m) => ({ displayName: m.businessName || m.name, email: m.email, verified: m.verified })),
          )
        : this.consignors.getById(id).pipe(
            map((c) => ({ displayName: c.name, email: c.email, verified: c.verified })),
          );
    return source.pipe(catchError(() => of(null)));
  }
}
