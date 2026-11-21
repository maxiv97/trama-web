import { Component, computed, input } from '@angular/core';
import { initialsOf } from '../../utils/initials';
import { BlobIcon, BlobTone } from '../blob-icon/blob-icon';
import { VerifiedSeal, VerifiedState } from '../verified/verified-seal';

const TONES: BlobTone[] = ['peach', 'sage', 'gold'];

@Component({
  selector: 'app-person-cell',
  imports: [BlobIcon, VerifiedSeal],
  template: `
    <app-blob-icon [initials]="initials()" [tone]="tone()" [size]="36" [verified]="verified()" />
    <span class="text">
      <span class="line">
        <span class="name">{{ name() }}</span>
        @if (verified() === 'verified') {
          <app-verified-seal class="inline-seal" [size]="14" />
        }
      </span>
      @if (meta()) {
        <span class="trama-table__meta">{{ meta() }}</span>
      }
      @if (verified() === 'verified') {
        <span class="sr-only">(verificado)</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .line {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }

    .inline-seal {
      display: none;
    }

    @media (width < 48rem) {
      :host-context(.trama-table--cards) app-blob-icon {
        display: none;
      }

      :host-context(.trama-table--cards) .inline-seal {
        display: inline-flex;
      }

      :host-context(.trama-table--cards) .text {
        align-items: flex-end;
        text-align: right;
      }
    }
  `,
})
export class PersonCell {
  readonly name = input.required<string>();
  readonly meta = input<string>();
  readonly verified = input<VerifiedState>();

  protected readonly initials = computed(() => initialsOf(this.name()));
  protected readonly tone = computed(() => {
    const sum = [...this.name()].reduce((total, char) => total + char.charCodeAt(0), 0);
    return TONES[sum % TONES.length];
  });
}
