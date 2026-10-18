import { Component, computed, input, output, signal } from '@angular/core';
import { LogOut, LucideAngularModule } from 'lucide-angular';
import { Role } from '../../../core/models/user.model';

const ROLE_LABELS: Record<Role, string> = {
  consignor: 'Cedente',
  merchant: 'Comercio',
};

@Component({
  selector: 'app-user-menu',
  imports: [LucideAngularModule],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="open.set(!open())"
        class="flex items-center gap-2 rounded-full hover:bg-trama-sand-100"
      >
        <span
          class="flex h-9 w-9 items-center justify-center rounded-full bg-trama-brand text-sm font-medium text-white"
        >
          {{ initials() }}
        </span>
        <span class="hidden pr-2 text-left md:block">
          <span class="block text-sm font-medium leading-tight text-trama-dark">{{ name() }}</span>
          <span class="block text-xs leading-tight text-trama-dark/50">{{ roleLabel() }}</span>
        </span>
      </button>

      @if (open()) {
        <div class="fixed inset-0 z-40" (click)="open.set(false)"></div>
        <div
          class="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-trama-sand-200 bg-trama-paper p-1 shadow-lg"
        >
          <div class="px-3 py-2 md:hidden">
            <p class="text-sm font-medium text-trama-dark">{{ name() }}</p>
            <p class="text-xs text-trama-dark/50">{{ roleLabel() }}</p>
          </div>
          <button
            type="button"
            (click)="onLogout()"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-trama-dark/70 hover:bg-trama-sand-100"
          >
            <lucide-angular [img]="logoutIcon" [size]="18" />
            Salir
          </button>
        </div>
      }
    </div>
  `,
})
export class UserMenu {
  readonly name = input.required<string>();
  readonly role = input.required<Role | null>();
  readonly logout = output<void>();

  protected readonly open = signal(false);
  protected readonly logoutIcon = LogOut;

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  });

  protected readonly roleLabel = computed(() => {
    const role = this.role();
    return role ? ROLE_LABELS[role] : '';
  });

  protected onLogout(): void {
    this.open.set(false);
    this.logout.emit();
  }
}
