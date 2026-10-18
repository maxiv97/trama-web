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
import { merchantPin, TILE_ATTRIBUTION, TILE_URL } from './map-pins';

const PIN_ICON = merchantPin();

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
