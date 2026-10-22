import { Component, computed, input, model, output, signal } from '@angular/core';
import { Camera, Image as ImageIcon, LucideAngularModule, Plus, X } from 'lucide-angular';
import { compressImage } from '../../../core/utils/image.util';
import { BLOB_PATH, BLOB_ROTATION } from '../../icons/trama-icons';

const MAX_BYTES = 10 * 1024 * 1024;

interface PendingSlot {
  id: number;
  name: string;
  status: 'loading' | 'error';
  reason?: string;
  file: File;
}

let nextSlot = 0;

/**
 * Subida de fotos (handoff §4.4): zona para soltar con borde hilvanado y una
 * grilla de casilleros cuadrados (radio 16).
 *
 * - Cargada: la miniatura sobre un blob, "Portada" en la primera y una × para quitarla.
 * - Subiendo: un hilo que avanza en loop y el nombre del archivo.
 * - Error: fondo rojo suave, hilo cortado, el motivo y "Reintentar".
 * - Vacía: borde hilvanado con "+" y la foto sugerida (Frente, Espalda, Etiqueta…).
 * - Las cargadas se reordenan arrastrando; la primera es la portada.
 */
@Component({
  selector: 'app-photo-uploader',
  imports: [LucideAngularModule],
  host: { class: 'block' },
  template: `
    <label
      class="drop flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-8 text-center transition-colors duration-150"
      [class.drop-over]="dragOver()"
      [class.drop-error]="invalid()"
      (dragover)="$event.preventDefault(); dragOver.set(true)"
      (dragleave)="dragOver.set(false)"
      (drop)="onDrop($event)"
    >
      <lucide-angular [img]="showCamera() ? galleryIcon : cameraIcon" [size]="28" class="flex text-trama-dark" />
      <span class="mt-1 text-[15px] font-bold text-trama-dark">{{ showCamera() ? 'Elegir de la galería' : 'Arrastrá las fotos o elegilas' }}</span>
      <span class="text-[13px] text-trama-body">JPG o PNG de hasta 10 MB · hasta {{ max() }} fotos</span>
      <input #file type="file" accept="image/*" multiple class="sr-only" (change)="onPick($event)" />
    </label>

    @if (showCamera()) {
      <input #cam type="file" accept="image/*" capture="environment" class="sr-only" (change)="onPick($event)" />
      <button
        type="button"
        class="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-trama-dark px-4 py-3 text-[15px] font-bold text-trama-sand-50 disabled:opacity-50"
        [disabled]="full()"
        (click)="cam.click()"
      >
        <lucide-angular [img]="cameraIcon" [size]="18" class="flex" />
        Sacar foto
      </button>
    }

    <div class="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(104px,124px))]">
      @for (photo of photos(); track photo; let i = $index) {
        <div
          class="tile group relative aspect-square cursor-grab"
          draggable="true"
          [class.opacity-50]="dragIndex() === i"
          (dragstart)="dragIndex.set(i)"
          (dragend)="dragIndex.set(null)"
          (dragover)="$event.preventDefault()"
          (drop)="onReorder($event, i)"
        >
          <svg class="absolute inset-0 h-full w-full" viewBox="-32 -32 64 64" preserveAspectRatio="none" aria-hidden="true">
            <path [attr.d]="blob" [attr.fill]="blobColor(i)" [attr.transform]="'rotate(' + (i * 37 - 20) + ')'" />
          </svg>
          <img [src]="photo" alt="" class="absolute inset-[10%] h-[80%] w-[80%] rounded-[14px] object-cover shadow-[0_6px_16px_rgba(31,58,43,.18)]" />
          @if (i === 0) {
            <span class="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-trama-dark px-2.5 py-0.5 text-[11px] font-bold text-trama-sand-50">Portada</span>
          }
          <button
            type="button"
            class="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-trama-paper text-trama-dark shadow-[0_2px_8px_rgba(31,58,43,.2)] hover:bg-status-none-soft hover:text-status-none"
            [attr.aria-label]="'Quitar foto ' + (i + 1)"
            (click)="remove(i)"
          >
            <lucide-angular [img]="xIcon" [size]="15" />
          </button>
        </div>
      }

      @for (slot of pending(); track slot.id) {
        @if (slot.status === 'loading') {
          <div class="tile flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-trama-sand-50 p-2">
            <svg width="64" height="10" viewBox="0 0 64 10" aria-hidden="true">
              <line x1="4" y1="5" x2="60" y2="5" stroke="#1F3A2B" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="9 7" class="run" />
            </svg>
            <span class="w-full truncate text-center text-[12px] text-trama-body">{{ slot.name }}</span>
          </div>
        } @else {
          <div class="tile flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl bg-status-none-soft p-2 text-center">
            <svg width="40" height="16" viewBox="0 0 16 16" fill="none" stroke="#C0392B" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <path d="M2 8h3.5M10.5 8H14M6.5 5.5l3 5M9.5 5.5l-3 5" />
            </svg>
            <span class="text-[12px] font-bold text-status-none">{{ slot.reason }}</span>
            <span class="w-full truncate text-[11px] text-trama-body">{{ slot.name }}</span>
            <span class="flex gap-2">
              @if (slot.reason !== tooBig) {
                <button type="button" class="text-[12px] font-bold text-trama-dark underline" (click)="retry(slot)">Reintentar</button>
              }
              <button type="button" class="text-[12px] font-semibold text-trama-body underline" (click)="dismiss(slot)">Quitar</button>
            </span>
          </div>
        }
      }

      @for (label of emptyLabels(); track label) {
        <button
          type="button"
          class="tile flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl text-trama-body transition-colors hover:bg-trama-sand-50 hover:text-trama-dark"
          style="border: 2px dashed #C9C2AE"
          (click)="file.click()"
        >
          <lucide-angular [img]="plusIcon" [size]="20" class="flex" />
          <span class="text-[13px] font-semibold">{{ label }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .drop {
      background: var(--color-trama-sand-50);
      border: 2px dashed #b9b095;
    }
    .drop:hover,
    .drop-over {
      border-color: var(--color-trama-dark);
      background: #f2ead6;
    }
    .drop-error {
      border-color: var(--color-status-none);
    }
    .run {
      animation: run 900ms linear infinite;
    }
    @keyframes run {
      to {
        stroke-dashoffset: -32;
      }
    }
  `,
})
export class PhotoUploader {
  readonly photos = model<string[]>([]);
  readonly max = input(6);
  /** Fotos sugeridas para los casilleros vacíos. */
  readonly suggestions = input<readonly string[]>(['Frente', 'Espalda', 'Etiqueta', 'Detalle', 'Otra', 'Otra']);
  readonly invalid = input(false);
  /** Ofrece "Sacar foto" con la cámara del dispositivo (solo en pantallas táctiles). */
  readonly allowCamera = input(false);
  /** Avisa cuando una foto no se pudo procesar (para un toast, si hace falta). */
  readonly failed = output<string>();

  protected readonly cameraIcon = Camera;
  protected readonly galleryIcon = ImageIcon;
  protected readonly plusIcon = Plus;
  protected readonly xIcon = X;
  protected readonly blob = BLOB_PATH;
  protected readonly tooBig = 'Supera 10 MB';

  protected readonly pending = signal<PendingSlot[]>([]);
  protected readonly dragOver = signal(false);
  protected readonly dragIndex = signal<number | null>(null);

  /** Se considera mobile cuando el puntero principal es táctil (celulares y tablets). */
  protected readonly isTouch =
    typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  protected readonly showCamera = computed(() => this.allowCamera() && this.isTouch);
  protected readonly full = computed(() => this.photos().length + this.pending().length >= this.max());

  protected readonly emptyLabels = computed(() => {
    const used = this.photos().length + this.pending().length;
    const free = Math.max(0, Math.min(3, this.max() - used));
    return this.suggestions().slice(used, used + free);
  });

  protected blobColor(i: number): string {
    return BLOB_ROTATION[i % BLOB_ROTATION.length];
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.add(input.files);
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files?.length) this.add(event.dataTransfer.files);
  }

  protected remove(i: number): void {
    this.photos.update((list) => list.filter((_, j) => j !== i));
  }

  protected onReorder(event: DragEvent, to: number): void {
    event.preventDefault();
    event.stopPropagation();
    const from = this.dragIndex();
    this.dragIndex.set(null);
    if (from === null || from === to) return;
    this.photos.update((list) => {
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  protected retry(slot: PendingSlot): void {
    this.pending.update((list) => list.map((s) => (s.id === slot.id ? { ...s, status: 'loading' } : s)));
    this.process(slot.id, slot.file);
  }

  protected dismiss(slot: PendingSlot): void {
    this.pending.update((list) => list.filter((s) => s.id !== slot.id));
  }

  private add(files: FileList): void {
    const room = this.max() - this.photos().length - this.pending().length;
    const images = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, Math.max(0, room));
    for (const file of images) {
      const id = nextSlot++;
      if (file.size > MAX_BYTES) {
        this.pending.update((list) => [...list, { id, name: file.name, status: 'error', reason: this.tooBig, file }]);
        continue;
      }
      this.pending.update((list) => [...list, { id, name: file.name, status: 'loading', file }]);
      this.process(id, file);
    }
  }

  private process(id: number, file: File): void {
    compressImage(file)
      .then((photo) => {
        this.pending.update((list) => list.filter((s) => s.id !== id));
        this.photos.update((list) => [...list, photo]);
      })
      .catch(() => {
        this.pending.update((list) =>
          list.map((s) => (s.id === id ? { ...s, status: 'error', reason: 'No se pudo leer' } : s)),
        );
        this.failed.emit(file.name);
      });
  }
}
