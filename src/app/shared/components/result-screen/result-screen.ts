import { Component, input } from '@angular/core';
import { Check, LucideIconData } from 'lucide-angular';
import { BlobIcon, BlobTone } from '../blob-icon/blob-icon';
import { Stitch } from '../stitch/stitch';

export interface ResultSummaryItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-result-screen',
  imports: [BlobIcon, Stitch],
  template: `
    <app-blob-icon [icon]="icon()" [tone]="tone()" [size]="104" />
    <div class="heading">
      <h1 class="trama-title-1">{{ title() }}</h1>
      <app-stitch class="stitch" variant="knot" [sew]="true" />
      @if (lead()) {
        <p class="trama-lead lead">{{ lead() }}</p>
      }
    </div>

    @if (summary().length) {
      <dl class="summary trama-inner-stitch">
        @for (item of summary(); track item.label) {
          <div class="item">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        }
      </dl>
    }

    <div class="actions">
      <ng-content select="[resultActions]" />
    </div>
    <div class="exit">
      <ng-content select="[resultLink]" />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      max-width: 560px;
      margin-inline: auto;
      padding: 32px 16px;
      text-align: center;
    }

    .heading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    h1 {
      margin: 0;
      color: var(--color-trama-dark);
    }

    .stitch {
      width: 200px;
      max-width: 100%;
    }

    .lead {
      margin: 0;
      max-width: 46ch;
      color: var(--color-trama-body);
    }

    .summary {
      --inner-stitch-inset: 5px;
      --inner-stitch-width: 2px;
      --inner-stitch-color: var(--color-trama-thread-light);
      --inner-stitch-radius: 12px;

      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      width: 100%;
      margin: 0;
      padding: 16px 18px;
      border-radius: var(--radius-popover);
      background-color: var(--color-trama-sand-50);
      text-align: left;
    }

    .item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    dt {
      color: var(--color-trama-body);
      font-size: 0.8125rem; /* 13px */
    }

    dd {
      margin: 0;
      color: var(--color-trama-dark);
      font-family: var(--font-display);
      font-size: 1.25rem; /* 20px */
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      width: 100%;
    }

    .actions > * {
      flex: 0 1 calc(50% - 6px);
    }

    .actions:empty,
    .exit:empty {
      display: none;
    }

    @media (width < 48rem) {
      .actions > * {
        flex-basis: 100%;
      }
    }
  `,
})
export class ResultScreen {
  readonly title = input.required<string>();
  readonly lead = input<string>();
  readonly icon = input<LucideIconData>(Check);
  readonly tone = input<BlobTone>('success');
  readonly summary = input<ResultSummaryItem[]>([]);
}
