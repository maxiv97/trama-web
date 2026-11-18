import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter, map } from 'rxjs';
import { Ellipsis, LucideAngularModule } from 'lucide-angular';
import { BlobIcon } from '../blob-icon/blob-icon';
import { NavItem } from './nav-items';

const BAR_SLOTS = 4;

const MATCH: Omit<IsActiveMatchOptions, 'paths'> = {
  queryParams: 'ignored',
  fragment: 'ignored',
  matrixParams: 'ignored',
};

let nextSheetId = 0;

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, BlobIcon],
  host: { '(document:keydown.escape)': 'sheetOpen.set(false)' },
  template: `
    @if (sheetOpen()) {
      <div class="veil" (click)="sheetOpen.set(false)"></div>
      <div class="sheet" [id]="sheetId" role="dialog" aria-label="Más secciones">
        <p class="sheet-title">Más secciones</p>
        <ul>
          @for (item of moreItems(); track item.link) {
            <li>
              <a
                [routerLink]="item.link"
                routerLinkActive="active"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                #link="routerLinkActive"
                (click)="sheetOpen.set(false)"
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
      </div>
    }

    <nav class="bar" aria-label="Secciones">
      @for (item of barItems(); track item.link) {
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
            @if (item.counter && unread()) {
              <span class="dot"
                ><span class="sr-only">{{ unread() }} sin leer</span></span
              >
            }
          </span>
          <span class="label">{{ item.label }}</span>
        </a>
      }
      @if (moreItems().length) {
        <button
          type="button"
          [class.active]="moreActive()"
          [attr.aria-expanded]="sheetOpen()"
          [attr.aria-controls]="sheetOpen() ? sheetId : null"
          (click)="sheetOpen.set(!sheetOpen())"
        >
          <span class="mark">
            @if (moreActive()) {
              <app-blob-icon [icon]="moreIcon" [size]="32" [iconSize]="20" />
            } @else {
              <lucide-angular [img]="moreIcon" [size]="20" />
            }
            @if (moreHasUnread()) {
              <span class="dot"></span>
            }
          </span>
          <span class="label">Más</span>
        </button>
      }
    </nav>
  `,
  styles: `
    .bar {
      position: fixed;
      inset-inline: 0;
      bottom: 0;
      z-index: 40;
      display: flex;
      padding-bottom: env(safe-area-inset-bottom);
      border-top: 1px solid var(--color-trama-sand-100);
      background-color: var(--color-trama-paper);
    }

    .bar > a,
    .bar > button {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      min-width: 0;
      min-height: 56px;
      padding: 6px 2px;
      color: var(--color-trama-muted);
      font-size: 0.6875rem; /* 11px */
      font-weight: 500;
      text-decoration: none;
    }

    .bar > .active {
      color: var(--color-trama-dark);
      font-weight: 700;
    }

    .bar .label {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mark {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
    }

    /* Aviso de no leídas: punto naranja */
    .dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 8px;
      height: 8px;
      border: 2px solid var(--color-trama-paper);
      border-radius: 50%;
      box-sizing: content-box;
      background-color: var(--color-trama-knot);
    }

    .veil {
      position: fixed;
      inset: 0;
      z-index: 40;
      background-color: var(--color-trama-overlay);
    }

    .sheet {
      position: fixed;
      inset-inline: 0;
      bottom: 0;
      z-index: 41;
      padding: 18px 14px calc(72px + env(safe-area-inset-bottom));
      border-radius: 22px 22px 0 0;
      background-color: var(--color-trama-paper);
      box-shadow: 0 -16px 40px rgba(31, 58, 43, 0.18);
      animation: sheet-up var(--duration-base) var(--ease-enter) both;
    }

    .sheet-title {
      margin: 0 0 8px;
      padding: 0 10px;
      color: var(--color-trama-muted);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .sheet a {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 48px;
      padding: 6px 10px;
      border-radius: 12px;
      color: var(--color-trama-body);
      font-size: 0.9375rem; /* 15px */
      font-weight: 500;
      text-decoration: none;
    }

    .sheet a.active {
      background-color: var(--color-trama-sand-50);
      color: var(--color-trama-dark);
      font-weight: 700;
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

    a:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--color-trama-brand);
      outline-offset: -2px;
      border-radius: 12px;
    }

    @keyframes sheet-up {
      from {
        transform: translateY(100%);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .sheet {
        animation: none;
      }
    }
  `,
})
export class BottomNav {
  private readonly router = inject(Router);

  readonly items = input.required<readonly NavItem[]>();
  readonly unread = input(0);

  protected readonly sheetId = `trama-more-${nextSheetId++}`;
  protected readonly sheetOpen = signal(false);
  protected readonly moreIcon = Ellipsis;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly fitsInBar = computed(() => this.items().length <= BAR_SLOTS + 1);
  protected readonly barItems = computed(() =>
    this.fitsInBar() ? this.items() : this.items().slice(0, BAR_SLOTS),
  );
  protected readonly moreItems = computed(() =>
    this.fitsInBar() ? [] : this.items().slice(BAR_SLOTS),
  );

  //Para menus con muchas opciones
  protected readonly moreActive = computed(() => {
    this.url();
    return this.moreItems().some((item) =>
      this.router.isActive(item.link, { ...MATCH, paths: item.exact ? 'exact' : 'subset' }),
    );
  });

  protected readonly moreHasUnread = computed(
    () => this.unread() > 0 && this.moreItems().some((item) => item.counter),
  );
}
