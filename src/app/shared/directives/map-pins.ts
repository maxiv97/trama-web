import * as L from 'leaflet';

/*
 * Pines y mapa base de Trama (handoff §4.20). Mapa cálido y sin azules: tiles de
 * OpenStreetMap con un filtro sepia suave (styles.css, .leaflet-tile-pane).
 * Se usa OSM estándar (sin API key) porque CARTO ahora exige token.
 */

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '© OpenStreetMap';

const STORE_PATH =
  '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>';

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Pin de comercio: gota de 40 px (border-radius 50% 50% 50% 6px, rotada −45°)
 * en verde profundo con Store amarillo. Seleccionado: 48 px en amarillo con
 * borde verde y una etiqueta oscura con el nombre (y la distancia).
 */
export function merchantPin(selected = false, label = ''): L.DivIcon {
  const size = selected ? 48 : 40;
  const bg = selected ? '#F2B636' : '#1F3A2B';
  const stroke = selected ? '#1F3A2B' : '#F2B636';
  const border = selected ? 'border:2.5px solid #1F3A2B;' : '';
  const tag = selected && label
    ? `<span style="position:absolute;left:50%;bottom:${size + 10}px;transform:translateX(-50%);white-space:nowrap;background:#1F3A2B;color:#F6F0E2;font:600 13px/1.3 'Hanken Grotesk',sans-serif;padding:6px 10px;border-radius:10px;box-shadow:0 8px 20px rgba(31,58,43,.2)">${escapeHtml(label)}</span>`
    : '';
  return L.divIcon({
    className: 't-map-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size * 1.2],
    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px">
      ${tag}
      <span style="position:absolute;inset:0;background:${bg};${border}border-radius:50% 50% 50% 6px;transform:rotate(-45deg);box-shadow:0 6px 16px rgba(31,58,43,.28)"></span>
      <svg style="position:absolute;inset:0;margin:auto" width="${size * 0.48}" height="${size * 0.48}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${STORE_PATH}</svg>
    </span>`,
  });
}

/** Persona usuaria: punto naranja de 18 px con borde crema. */
export function personPin(): L.DivIcon {
  return L.divIcon({
    className: 't-map-pin',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#E07A3A;border:3px solid #F6F0E2;box-shadow:0 2px 8px rgba(31,58,43,.35)"></span>',
  });
}

/** Radio de búsqueda: círculo hilvanado verde de 2 px con un relleno al 7 %. */
export const SEARCH_RADIUS_STYLE: L.CircleMarkerOptions = {
  color: '#2E7D54',
  weight: 2,
  dashArray: '6 6',
  fillColor: '#2E7D54',
  fillOpacity: 0.07,
};
