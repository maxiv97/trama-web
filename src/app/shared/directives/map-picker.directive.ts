import { afterNextRender, Directive, ElementRef, inject, input, OnDestroy, output } from '@angular/core';
import * as L from 'leaflet';

// Fallback centre when no initial coordinates are given: downtown Córdoba.
const CORDOBA = { lat: -31.4201, lng: -64.1888 };

export interface Coords {
  lat: number;
  lng: number;
}

// Wraps Leaflet directly (no deprecated ngx-leaflet) to place a draggable pin on the host div and
// report its coordinates. The pin starts on the given point — or the city centre — and moves on
// drag or a tap anywhere on the map.
@Directive({ selector: '[appMapPicker]' })
export class MapPickerDirective implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly lat = input<number | undefined>();
  readonly lng = input<number | undefined>();
  readonly zoom = input(14);
  readonly coordsChange = output<Coords>();

  private map?: L.Map;
  private marker?: L.Marker;

  constructor() {
    afterNextRender(() => this.init());
  }

  private init(): void {
    const start: Coords = { lat: this.lat() ?? CORDOBA.lat, lng: this.lng() ?? CORDOBA.lng };

    this.map = L.map(this.host.nativeElement, { attributionControl: false }).setView(
      [start.lat, start.lng],
      this.zoom(),
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);

    const icon = L.divIcon({
      className: '',
      html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#2e7d54;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    this.marker = L.marker([start.lat, start.lng], { icon, draggable: true }).addTo(this.map);
    this.marker.on('dragend', () => this.emit());
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.marker?.setLatLng(event.latlng);
      this.emit();
    });

    // The container is often laid out just before the map mounts; recompute its size once settled.
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private emit(): void {
    const { lat, lng } = this.marker!.getLatLng();
    this.coordsChange.emit({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
