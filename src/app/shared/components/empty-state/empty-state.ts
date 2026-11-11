import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Inbox, LucideIconData } from 'lucide-angular';
import { BlobIcon } from '../blob-icon/blob-icon';

@Component({
  selector: 'app-empty-state',
  imports: [RouterLink, BlobIcon],
  template: `
    <app-blob-icon [icon]="icon()" [size]="72" tone="cream" />
    <p class="message">{{ message() }}</p>
    @if (link(); as target) {
      <a [routerLink]="target" class="trama-btn trama-btn--small">{{ linkLabel() }}</a>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 32px 20px;
      border: 2px dashed var(--color-trama-thread-faint);
      border-radius: var(--radius-popover);
      background-color: var(--color-trama-paper);
      text-align: center;
    }

    .message {
      margin: 0;
      max-width: 36ch;
      color: var(--color-trama-dark);
      font-family: var(--font-display);
      font-size: 1.125rem;
      font-weight: 700;
      line-height: 1.3;
    }
  `,
})
export class EmptyState {
  readonly message = input.required<string>();
  readonly link = input<string>();
  readonly linkLabel = input<string>();
  readonly icon = input<LucideIconData>(Inbox);
}
