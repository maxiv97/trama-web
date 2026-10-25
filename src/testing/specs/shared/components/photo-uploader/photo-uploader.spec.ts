import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { PhotoUploader } from '../../../../../app/shared/components/photo-uploader/photo-uploader';

const originalMatchMedia = window.matchMedia;

/** Simula el tipo de puntero del dispositivo: táctil (celular) o mouse (computadora). */
function setPointer(coarse: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: query === '(pointer: coarse)' ? coarse : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function render(opts: { coarse: boolean; allowCamera?: boolean; photos?: string[]; max?: number }) {
  setPointer(opts.coarse);
  const fixture = TestBed.createComponent(PhotoUploader);
  if (opts.allowCamera !== undefined) fixture.componentRef.setInput('allowCamera', opts.allowCamera);
  if (opts.photos) fixture.componentRef.setInput('photos', opts.photos);
  if (opts.max !== undefined) fixture.componentRef.setInput('max', opts.max);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const cameraButton = Array.from(host.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Sacar foto'),
  ) as HTMLButtonElement | undefined;
  return { host, cameraButton };
}

describe('PhotoUploader · cámara en mobile', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('en computadora no ofrece la cámara aunque allowCamera esté activo', () => {
    const { host, cameraButton } = render({ coarse: false, allowCamera: true });
    expect(cameraButton).toBeUndefined();
    expect(host.querySelector('input[capture]')).toBeNull();
    expect(host.textContent).toContain('Arrastrá las fotos o elegilas');
  });

  it('en celular sin allowCamera se mantiene como antes', () => {
    const { host, cameraButton } = render({ coarse: true });
    expect(cameraButton).toBeUndefined();
    expect(host.querySelector('input[capture]')).toBeNull();
    expect(host.textContent).toContain('Arrastrá las fotos o elegilas');
  });

  it('en celular con allowCamera muestra "Sacar foto" con la cámara trasera', () => {
    const { host, cameraButton } = render({ coarse: true, allowCamera: true });
    expect(cameraButton).toBeDefined();
    expect(cameraButton!.disabled).toBe(false);
    const cam = host.querySelector('input[capture]') as HTMLInputElement;
    expect(cam.getAttribute('capture')).toBe('environment');
    expect(cam.getAttribute('accept')).toBe('image/*');
    expect(host.textContent).toContain('Elegir de la galería');
    // El selector de galería sigue disponible y admite varias fotos.
    expect(host.querySelector('input[type="file"][multiple]:not([capture])')).not.toBeNull();
  });

  it('desactiva "Sacar foto" cuando se alcanzó el máximo de fotos', () => {
    const photos = ['data:a', 'data:b', 'data:c', 'data:d'];
    const { cameraButton } = render({ coarse: true, allowCamera: true, photos, max: 4 });
    expect(cameraButton!.disabled).toBe(true);
  });
});
