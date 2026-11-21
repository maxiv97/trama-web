import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Hanger } from '../../icons/hanger';

// Si no hay imagen
const BLOB_COLORS = [
  'var(--color-trama-gold)',
  'var(--color-trama-sage-soft)',
  'var(--color-trama-peach)',
];
const BLOB_TURNS = [-6, 5, -3, 4];

function hashOf(text: string): number {
  return [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

@Component({
  selector: 'app-item-cell',
  imports: [RouterLink, LucideAngularModule],
  template: `
    @if (photo(); as src) {
      <img class="trama-thumb" [src]="src" alt="" loading="lazy" />
    } @else {
      <span
        class="trama-thumb blob"
        aria-hidden="true"
        [style.background-color]="blobColor()"
        [style.rotate.deg]="blobTurn()"
      >
        <lucide-angular [img]="hangerIcon" [size]="20" />
      </span>
    }
    <span class="text">
      @if (link(); as target) {
        <a class="name" [routerLink]="target">{{ name() }}</a>
      } @else {
        <span class="name">{{ name() }}</span>
      }
      @if (meta()) {
        <span class="trama-table__meta">{{ meta() }}</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .blob {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px 18px 14px 20px;
      color: var(--color-trama-dark);
    }

    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .name {
      overflow: hidden;
      color: var(--color-trama-dark);
      font-weight: 600;
      text-decoration: none;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    a.name:hover {
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    a.name:focus-visible {
      outline: 3px solid var(--color-trama-green-50);
      outline-offset: 2px;
      border-radius: 4px;
    }
  `,
})
export class ItemCell {
  readonly name = input.required<string>();
  readonly meta = input<string>();
  readonly photo = input<string | null>();
  readonly link = input<readonly unknown[] | string>();

  protected readonly hangerIcon = Hanger;
  private readonly hash = computed(() => hashOf(this.name()));
  protected readonly blobColor = computed(() => BLOB_COLORS[this.hash() % BLOB_COLORS.length]);
  protected readonly blobTurn = computed(() => BLOB_TURNS[this.hash() % BLOB_TURNS.length]);
}
