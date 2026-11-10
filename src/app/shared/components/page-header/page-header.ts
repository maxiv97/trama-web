import { Component, input } from '@angular/core';
import { LucideIconData } from 'lucide-angular';
import { BlobIcon, BlobTone } from '../blob-icon/blob-icon';
import { Stitch } from '../stitch/stitch';

@Component({
  selector: 'app-page-header',
  imports: [BlobIcon, Stitch],
  template: `
    <div class="heading">
      @if (eyebrow()) {
        <div class="section">
          @if (icon(); as sectionIcon) {
            <app-blob-icon [icon]="sectionIcon" [tone]="tone()" />
          }
          <span class="trama-eyebrow">{{ eyebrow() }}</span>
        </div>
      }
      <h1 class="trama-title-1">{{ title() }}</h1>
      @if (stitched()) {
        <app-stitch class="stitch" variant="knot" [sew]="true" />
      }
      @if (lead()) {
        <p class="trama-lead lead">{{ lead() }}</p>
      }
    </div>
    <div class="actions">
      <ng-content select="[pageActions]" />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px 24px;
    }

    .heading {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }

    .section {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--color-trama-muted);
    }

    h1 {
      margin: 0;
      color: var(--color-trama-dark);
    }

    .stitch {
      width: 100%;
      max-width: 200px;
    }

    .lead {
      margin: 0;
      max-width: 46ch;
      color: var(--color-trama-body);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .actions:empty {
      display: none;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  // Rol o grupo de la sección
  readonly eyebrow = input<string>();
  readonly icon = input<LucideIconData>();
  readonly tone = input<BlobTone>('gold');
  // Bajada de la sección
  readonly lead = input<string>();
  // Subrayado bajo el título
  readonly stitched = input(false);
}
