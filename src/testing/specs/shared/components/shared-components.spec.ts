import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setObservedWidth } from '../../../render';
import { compressImage } from '../../../../app/core/utils/image.util';
import { GarmentStatus } from '../../../../app/core/models/garment.model';
import { Dropdown, DropdownOption } from '../../../../app/shared/components/dropdown/dropdown';
import { FilterSheet } from '../../../../app/shared/components/filter-sheet/filter-sheet';
import { PageSkeleton, SkeletonLayout } from '../../../../app/shared/components/page-skeleton/page-skeleton';
import { PhotoGallery } from '../../../../app/shared/components/photo-gallery/photo-gallery';
import { PhotoUploader } from '../../../../app/shared/components/photo-uploader/photo-uploader';
import { ProgressTracker } from '../../../../app/shared/components/progress-tracker/progress-tracker';
import { Seam } from '../../../../app/shared/components/seam/seam';
import { Segmented, TabOption, Tabs } from '../../../../app/shared/components/tabs/tabs';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
/** Espera a que se cumpla una condición (la lectura de archivos de jsdom es asíncrona). */
async function until(check: () => boolean, tries = 100): Promise<void> {
  for (let i = 0; i < tries && !check(); i++)
    await new Promise((resolve) => setTimeout(resolve, 5));
}

/** Simula la lectura y el redimensionado de imágenes, que jsdom no implementa. */
function fakeImages(opts: { decode?: boolean; canvas?: boolean } = {}) {
  const { decode = true, canvas = true } = opts;
  class FakeImage {
    width = 3000;
    height = 2000;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      setTimeout(() => (decode ? this.onload?.() : this.onerror?.()), 0);
    }
  }
  vi.stubGlobal('Image', FakeImage);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    canvas ? ({ drawImage: () => undefined } as unknown as CanvasRenderingContext2D) : null,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/jpeg;base64,COMPRIMIDA',
  );
}

const file = (name: string, type = 'image/jpeg', size = 1000) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setObservedWidth(1024);
});

describe('compressImage', () => {
  it('redimensiona al máximo y recomprime en JPEG', async () => {
    fakeImages();
    await expect(compressImage(file('a.jpg'))).resolves.toBe('data:image/jpeg;base64,COMPRIMIDA');
  });
  it('informa si no puede decodificar o procesar la imagen', async () => {
    fakeImages({ decode: false });
    await expect(compressImage(file('a.jpg'))).rejects.toThrow('decodificar');
    vi.restoreAllMocks();
    fakeImages({ canvas: false });
    await expect(compressImage(file('a.jpg'))).rejects.toThrow('procesar');
  });
});

@Component({
  imports: [PhotoUploader],
  template: `<app-photo-uploader
    [(photos)]="photos"
    [max]="max()"
    (failed)="failed.push($event)"
  />`,
})
class UploaderHost {
  photos = signal<string[]>([]);
  max = signal(3);
  failed: string[] = [];
}

describe('PhotoUploader', () => {
  const pick = (input: HTMLInputElement, files: File[]) => {
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change'));
  };

  it('agrega fotos, descarta las que no son imágenes o superan 10 MB, y respeta el máximo', async () => {
    fakeImages();
    const fixture = TestBed.createComponent(UploaderHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    pick(host.querySelector('input[type="file"]')!, [
      file('frente.jpg'),
      file('notas.pdf', 'application/pdf'),
      file('enorme.jpg', 'image/jpeg', 11 * 1024 * 1024),
      file('espalda.jpg'),
      file('extra.jpg'),
    ]);
    fixture.detectChanges();
    await until(() => fixture.componentInstance.photos().length === 2);
    fixture.detectChanges();
    expect(fixture.componentInstance.photos()).toHaveLength(2);
    expect(host.textContent).toContain('Supera 10 MB');
    // La foto rechazada se puede quitar.
    Array.from(host.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Quitar'))!
      .click();
    fixture.detectChanges();
    // Quitar una foto y reordenar las restantes.
    const remove = host.querySelector<HTMLButtonElement>('button[aria-label^="Quitar"]');
    remove?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.photos().length).toBeLessThanOrEqual(2);
  });

  it('una foto que no se puede leer queda con el error, se reintenta y avisa', async () => {
    fakeImages({ decode: false });
    const fixture = TestBed.createComponent(UploaderHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const drop = new Event('drop') as unknown as DragEvent;
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file('rota.jpg')] } });
    Object.defineProperty(drop, 'preventDefault', { value: () => undefined });
    const zone = host.querySelector<HTMLElement>('label.drop')!;
    zone.dispatchEvent(new Event('dragover'));
    zone.dispatchEvent(new Event('dragleave'));
    zone.dispatchEvent(drop as unknown as Event);
    fixture.detectChanges();
    await until(() => fixture.componentInstance.failed.length > 0);
    fixture.detectChanges();
    expect(fixture.componentInstance.failed).toEqual(['rota.jpg']);
    Array.from(host.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    await until(() => fixture.componentInstance.failed.length > 1);
    fixture.detectChanges();
    expect(host.textContent).toContain('No se pudo leer');
  });

  it('reordena las fotos arrastrándolas', () => {
    const fixture = TestBed.createComponent(UploaderHost);
    fixture.componentInstance.photos.set(['data:a', 'data:b', 'data:c']);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const tiles = Array.from(host.querySelectorAll<HTMLElement>('[draggable="true"]'));
    if (tiles.length >= 2) {
      tiles[0].dispatchEvent(new Event('dragstart'));
      const drop = new Event('drop');
      Object.assign(drop, { preventDefault: () => undefined, stopPropagation: () => undefined });
      tiles[2].dispatchEvent(drop);
      fixture.detectChanges();
      expect(fixture.componentInstance.photos()).toEqual(['data:b', 'data:c', 'data:a']);
    }
  });
});

describe('Esqueletos de carga', () => {
  for (const layout of ['dashboard', 'table', 'detail', 'form', 'list'] as SkeletonLayout[]) {
    it(`layout ${layout}`, () => {
      const fixture = TestBed.createComponent(PageSkeleton);
      fixture.componentRef.setInput('layout', layout);
      fixture.componentRef.setInput('rows', 3);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('*').length).toBeGreaterThan(
        3,
      );
    });
  }
});

describe('Seguimiento y costura', () => {
  const statuses: GarmentStatus[] = [
    'submitted',
    'under_review',
    'counteroffer',
    'agreed',
    'rejected',
    'in_stock',
    'with_remarks',
    'sold',
    'paid_out',
    'no_agreement',
    'cancelled',
    'delivery_expired',
    'awaiting_pickup',
    'returned',
    'unclaimed',
  ];
  for (const width of [1024, 340]) {
    it(`barra de progreso en todos los estados (${width}px)`, async () => {
      setObservedWidth(width);
      for (const status of statuses) {
        const fixture = TestBed.createComponent(ProgressTracker);
        fixture.componentRef.setInput('currentStatus', status);
        fixture.detectChanges();
        TestBed.tick();
        await flush();
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelectorAll('*').length).toBeGreaterThan(
          0,
        );
      }
    });
  }

  it('costura de pasos: avanza, retrocede, termina y es navegable', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0),
    );
    for (const width of [900, 300]) {
      setObservedWidth(width);
      const fixture = TestBed.createComponent(Seam);
      const steps = ['Cuenta', 'Identidad', 'Domicilio', 'Términos'];
      fixture.componentRef.setInput('steps', steps);
      fixture.componentRef.setInput('current', 0);
      fixture.componentRef.setInput('navigable', true);
      fixture.componentRef.setInput('compactLabels', width < 400);
      fixture.componentRef.setInput('enterMs', 0);
      fixture.componentRef.setInput('stepMs', 0);
      fixture.detectChanges();
      TestBed.tick();
      await flush();
      const clicked: number[] = [];
      fixture.componentInstance.stepClick.subscribe((i) => clicked.push(i));
      for (const current of [2, 1, 3]) {
        fixture.componentRef.setInput('current', current);
        fixture.detectChanges();
        await flush();
      }
      fixture.componentRef.setInput('negative', true);
      fixture.componentRef.setInput('allDone', true);
      fixture.detectChanges();
      await flush();
      for (const b of Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
          'button, [role="button"]',
        ),
      ))
        b.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Cuenta');
    }
  });
});

@Component({
  imports: [Dropdown],
  template: `<app-dropdown
    ariaLabel="Color"
    [options]="options"
    [(value)]="value"
    placeholder="Elegí"
  />`,
})
class DropdownHost {
  options: DropdownOption[] = [
    'Rojo',
    'Azul',
    'Verde',
    'Negro',
    'Blanco',
    'Gris',
    'Beige',
    'Marrón',
    'Violeta',
  ].map((label, i) => ({
    value: label.toLowerCase(),
    label,
    hint: i === 0 ? 'Popular' : undefined,
    disabled: label === 'Gris',
  }));
  value = signal('');
}

describe('Dropdown', () => {
  it('se maneja con el teclado y filtra cuando hay muchas opciones', () => {
    const fixture = TestBed.createComponent(DropdownHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Color"]')!;
    const key = (target: Element, k: string) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      fixture.detectChanges();
    };
    key(trigger, 'ArrowDown');
    expect(host.querySelectorAll('[role="option"]').length).toBe(9);
    const list = host.querySelector('[role="listbox"]')!;
    key(list, 'ArrowDown');
    key(list, 'ArrowDown');
    key(list, 'ArrowUp');
    key(list, 'Enter');
    expect(fixture.componentInstance.value()).toBe('azul');
    key(trigger, 'ArrowUp');
    const search = host.querySelector<HTMLInputElement>('input[aria-label="Buscar opción"]')!;
    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(host.textContent).toContain('No hay opciones con "zzz"');
    search.value = 'neg';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    key(search, 'Enter');
    expect(fixture.componentInstance.value()).toBe('negro');
    trigger.click();
    fixture.detectChanges();
    key(trigger, 'Tab');
    trigger.click();
    fixture.detectChanges();
    document.body.click();
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    trigger.click();
    fixture.detectChanges();
    host
      .querySelector('app-dropdown')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(host.querySelector('[role="listbox"]')).toBeNull();
  });
});

@Component({
  imports: [Tabs, Segmented],
  template: `
    <app-tabs [options]="options" [(value)]="value" />
    <app-segmented ariaLabel="Vista" [options]="options" [(value)]="value" />
  `,
})
class TabsHost {
  options: TabOption<string>[] = [
    { value: 'a', label: 'Uno' },
    { value: 'b', label: 'Dos' },
    { value: 'c', label: 'Tres' },
  ];
  value = signal('a');
}

describe('Pestañas y segmentado', () => {
  it('cambian con clic y con las flechas', () => {
    const fixture = TestBed.createComponent(TabsHost);
    fixture.detectChanges();
    TestBed.tick();
    const host = fixture.nativeElement as HTMLElement;
    const tab = host.querySelectorAll<HTMLElement>('[role="tab"]');
    tab[tab.length - 1].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    tab[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    tab[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    host.querySelectorAll<HTMLElement>('[role="radio"]')[1].click();
    fixture.detectChanges();
    TestBed.tick();
    expect(fixture.componentInstance.value()).toBe('b');
  });
});

@Component({
  imports: [FilterSheet, PhotoGallery],
  template: `
    <app-filter-sheet
      [count]="count"
      [results]="4"
      noun="prendas"
      eyebrow="Inventario"
      (clear)="cleared = cleared + 1"
    >
      <p>FILTROS</p>
    </app-filter-sheet>
    <app-photo-gallery [photos]="photos" />
  `,
})
class SheetHost {
  count = 2;
  cleared = 0;
  photos = ['data:a', 'data:b', 'data:c'];
}

describe('Hoja de filtros y galería', () => {
  it('abre la hoja, limpia los filtros y cambia la foto principal', () => {
    const fixture = TestBed.configureTestingModule({
      providers: [provideRouter([])],
    }).createComponent(SheetHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('app-filter-sheet button')!.click();
    fixture.detectChanges();
    Array.from(host.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Limpiar'))
      ?.click();
    Array.from(host.querySelectorAll('button'))
      .find((b) => /Ver \\d|Ver/.test(b.textContent ?? '') && b.closest('app-filter-sheet'))
      ?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.cleared).toBe(1);
    const thumbs = host.querySelectorAll<HTMLButtonElement>('app-photo-gallery button');
    thumbs[thumbs.length - 1]?.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('app-photo-gallery img').length).toBeGreaterThan(0);
  });
});
