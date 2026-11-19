import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogOut, LucideAngularModule, Settings, Store } from 'lucide-angular';
import { Role } from '../../../core/models/user.model';
import { initialsOf } from '../../utils/initials';
import { BlobIcon } from '../blob-icon/blob-icon';
import { ROLE_LABELS } from '../shell/nav-items';

let nextPanelId = 0;

@Component({
  selector: 'app-user-menu',
  imports: [RouterLink, LucideAngularModule, BlobIcon],
  host: {
    '(document:click)': 'closeOnOutside($event)',
    '(document:keydown.escape)': 'closeAndFocus()',
  },
  template: `
    <button
      #trigger
      type="button"
      class="trigger"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? panelId : null"
      (click)="open.set(!open())"
    >
      @if (role() === 'merchant') {
        <app-blob-icon [icon]="storeIcon" [size]="36" />
      } @else {
        <app-blob-icon [initials]="initials()" tone="peach" [size]="36" />
      }
      <span class="who">
        <span class="name">{{ name() }}</span>
        <span class="role">{{ roleLabel() }}</span>
      </span>
      <span class="sr-only">Menú de usuario</span>
    </button>

    @if (open()) {
      <div class="panel" [id]="panelId">
        <p class="identity">
          <b>{{ name() }}</b>
          <span>{{ roleLabel() }}</span>
        </p>
        @if (role() === 'merchant') {
          <hr />
          <a class="option" routerLink="/m/settings" (click)="open.set(false)">
            <lucide-angular [img]="settingsIcon" [size]="18" />
            Configuración
          </a>
        }
        <hr />
        <button type="button" class="option logout" (click)="onLogout()">
          <lucide-angular [img]="logoutIcon" [size]="18" />
          Cerrar sesión
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }

    .trigger {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 2px 10px 2px 2px;
      border-radius: 999px;
      cursor: pointer;
      transition: background-color var(--duration-fast);
    }

    .trigger:hover {
      background-color: var(--color-trama-sand-50);
    }

    .trigger:focus-visible {
      outline: 3px solid var(--color-trama-green-50);
      outline-offset: 2px;
    }

    .who {
      display: none;
      flex-direction: column;
      text-align: left;
      line-height: 1.25;
    }

    @media (width >= 48rem) {
      .who {
        display: flex;
      }
    }

    .name {
      color: var(--color-trama-dark);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .role {
      color: var(--color-trama-muted);
      font-size: 0.8125rem;
    }

    .panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 260px;
      padding: 16px;
      border-radius: 18px;
      background-color: var(--color-trama-paper);
      box-shadow: var(--shadow-popover);
      font-size: 0.875rem;
    }

    .identity {
      display: flex;
      flex-direction: column;
      margin: 0;
      color: var(--color-trama-dark);
    }

    .identity span {
      color: var(--color-trama-muted);
      font-size: 0.8125rem;
    }

    hr {
      height: 2px;
      margin: 0;
      border: 0;
      background: linear-gradient(to right, var(--color-trama-thread-light) 8px, transparent 8px) 0
        0 / 15px 2px repeat-x;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 40px;
      margin-inline: -8px;
      padding: 4px 8px;
      border-radius: 10px;
      color: var(--color-trama-dark);
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      transition: background-color var(--duration-fast);
    }

    .option:hover {
      background-color: var(--color-trama-sand-50);
    }

    .logout {
      color: var(--color-trama-red);
      font-weight: 600;
    }

    .logout:hover {
      background-color: var(--color-status-none-soft);
    }

    .option:focus-visible {
      outline: 2px solid var(--color-trama-brand);
      outline-offset: -2px;
    }
  `,
})
export class UserMenu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly name = input.required<string>();
  readonly role = input.required<Role | null>();
  readonly logout = output<void>();

  protected readonly panelId = `trama-user-menu-${nextPanelId++}`;
  protected readonly open = signal(false);
  protected readonly storeIcon = Store;
  protected readonly settingsIcon = Settings;
  protected readonly logoutIcon = LogOut;

  protected readonly initials = computed(() => initialsOf(this.name()));
  protected readonly roleLabel = computed(() => {
    const role = this.role();
    return role ? ROLE_LABELS[role] : '';
  });

  protected closeOnOutside(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected closeAndFocus(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }

  protected onLogout(): void {
    this.open.set(false);
    this.logout.emit();
  }
}
