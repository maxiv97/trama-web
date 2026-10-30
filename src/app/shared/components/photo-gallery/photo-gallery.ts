import { Component, input, signal } from '@angular/core';
import { LucideAngularModule, Shirt } from 'lucide-angular';

@Component({
  selector: 'app-photo-gallery',
  imports: [LucideAngularModule],
  template: `
    @if (photos().length) {
      <div>
        <img
          [src]="photos()[selected()]"
          alt="Foto del artículo"
          class="aspect-square w-full rounded-xl bg-trama-sand-100 object-cover"
        />
        @if (photos().length > 1) {
          <div class="mt-3 flex gap-2 overflow-x-auto">
            @for (photo of photos(); track $index) {
              <button
                type="button"
                (click)="selected.set($index)"
                class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2"
                [class]="$index === selected() ? 'border-trama-brand' : 'border-transparent'"
              >
                <img [src]="photo" alt="" class="h-full w-full object-cover" />
              </button>
            }
          </div>
        }
      </div>
    } @else {
      <div
        class="flex aspect-square w-full flex-col items-center justify-center rounded-xl bg-trama-sand-100 text-trama-dark/40"
      >
        <lucide-angular [img]="shirtIcon" [size]="48" />
        <span class="mt-2 text-sm">Sin fotos</span>
      </div>
    }
  `,
})
export class PhotoGallery {
  readonly photos = input<string[]>([]);
  protected readonly selected = signal(0);
  protected readonly shirtIcon = Shirt;
}
