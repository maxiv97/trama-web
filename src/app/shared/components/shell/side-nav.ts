import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Role } from '../../../core/models/user.model';
import { BlobIcon } from '../blob-icon/blob-icon';
import { LogoIcon } from '../logo/logo';
import { NavItem, ROLE_LABELS } from './nav-items';

@Component({
  selector: 'app-side-nav',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, BlobIcon, LogoIcon],
  template: `
    <div class="brand">
      <app-logo-icon [size]="26" />
      <span class="wordmark">Trama</span>
    </div>
    @if (role(); as currentRole) {
      <p class="role">{{ roleLabels[currentRole] }}</p>
    }
    <nav aria-label="Secciones">
      <ul>
        @for (item of items(); track item.link) {
          <li>
            <a
              [routerLink]="item.link"
              routerLinkActive="active"
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              #link="routerLinkActive"
            >
              <span class="mark">
                @if (link.isActive) {
                  <app-blob-icon [icon]="item.icon" [size]="32" [iconSize]="20" />
                } @else {
                  <lucide-angular [img]="item.icon" [size]="20" />
                }
              </span>
              {{ item.label }}
              @if (item.counter && unread()) {
                <span class="count">{{ unread() }}<span class="sr-only"> sin leer</span></span>
              }
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: `
    :host {
      --nav-ink: var(--color-trama-sand-50);
      --nav-ink-soft: color-mix(in srgb, var(--color-trama-sand-50) 72%, transparent);
      --nav-tint: color-mix(in srgb, var(--color-trama-sand-50) 8%, transparent);

      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow-y: auto;
      padding: 20px 14px;
      background-color: var(--color-trama-sidebar);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 8px 16px;
    }

    .wordmark {
      color: var(--nav-ink);
      font-family: var(--font-display);
      font-size: 1.1875rem; /* 19px */
      font-weight: 700;
    }

    .role {
      margin: 0;
      padding: 0 10px 6px;
      color: color-mix(in srgb, var(--color-trama-sand-50) 55%, transparent);
      font-size: 0.6875rem; /* 11px */
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    a {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      padding: 6px 10px;
      border-radius: 12px;
      color: var(--nav-ink-soft);
      font-size: 0.875rem; /* 14px */
      font-weight: 500;
      text-decoration: none;
      transition:
        background-color var(--duration-fast),
        color var(--duration-fast);
    }

    a:hover {
      background-color: var(--nav-tint);
      color: var(--nav-ink);
    }

    a:focus-visible {
      outline: 2px solid var(--color-trama-gold);
      outline-offset: 2px;
    }

    a.active {
      background-color: var(--nav-tint);
      color: var(--nav-ink);
      font-weight: 700;
    }

    .mark {
      display: flex;
      flex-shrink: 0;
      justify-content: center;
      width: 32px;
    }

    .count {
      margin-left: auto;
      min-width: 20px;
      padding: 1px 6px;
      border-radius: 999px;
      background-color: var(--color-trama-knot);
      color: var(--color-trama-dark);
      font-size: 0.75rem;
      font-weight: 700;
      text-align: center;
    }
  `,
})
export class SideNav {
  readonly items = input.required<readonly NavItem[]>();
  readonly role = input<Role | null>(null);
  readonly unread = input(0);

  protected readonly roleLabels = ROLE_LABELS;
}
