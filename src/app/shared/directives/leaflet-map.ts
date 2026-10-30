import {
  afterNextRender,
  Directive,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import * as L from 'leaflet';
import { GeoPoint } from '../../core/models/sales-point.model';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap';

const PIN_ICON = L.divIcon({
  className: '',
  iconSize: [24, 32],
  iconAnchor: [12, 32],
  html: `
    <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8 12 20 12 20s12-12 12-20C24 5.4 18.6 0 12 0z" fill="#2e7d54"/>
      <circle cx="12" cy="12" r="5" fill="#ffffff"/>
    </svg>`,
});

@Directive({
  selector: '[appLeafletMap]',
})
export class LeafletMap {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly center = input.required<GeoPoint>();
  readonly zoom = input(14);
  readonly markers = input<GeoPoint[]>([]);
  readonly pickable = input(false);

  readonly pointPicked = output<GeoPoint>();

  private map?: L.Map;
  private readonly markerLayer = L.layerGroup();

  constructor() {
    afterNextRender(() => this.initMap());

    effect(() => {
      const points = this.markers();
      if (this.map) this.renderMarkers(points);
    });

    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  private initMap(): void {
    const { lat, lng } = this.center();
    const map = L.map(this.host.nativeElement).setView([lat, lng], this.zoom());
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);
    this.markerLayer.addTo(map);

    if (this.pickable()) {
      map.on('click', (event: L.LeafletMouseEvent) =>
        this.pointPicked.emit({ lat: event.latlng.lat, lng: event.latlng.lng }),
      );
    }

    this.map = map;
    this.renderMarkers(this.markers());
    map.invalidateSize();
  }

  private renderMarkers(points: GeoPoint[]): void {
    this.markerLayer.clearLayers();
    for (const point of points) {
      L.marker([point.lat, point.lng], { icon: PIN_ICON }).addTo(this.markerLayer);
    }
  }
}
