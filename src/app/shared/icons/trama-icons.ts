import { LucideIconData } from 'lucide-angular';

/**
 * Percha propia para Inventario (handoff §3): mismo trazo de 2 px y extremos
 * redondeados que Lucide, que no trae una percha.
 */
export const Hanger: LucideIconData = [
  ['path', { d: 'M10 6a2 2 0 1 1 2 2v2l-8.4 6.3a1 1 0 0 0 .6 1.7h15.6a1 1 0 0 0 .6-1.7L12 10' }],
];

/** Hilo cortado: ícono de error de los campos y los mensajes (handoff §4.4). */
export const CutThread: LucideIconData = [
  ['path', { d: 'M2 12h5 M17 12h5 M9.5 8.5l5 7 M14.5 8.5l-5 7' }],
];

/** Hilván ondulado: ícono de aviso (handoff §4.10). */
export const BasteWave: LucideIconData = [
  ['path', { d: 'M2 12c2.4-3.6 4.2-3.6 6.4 0s4.2 3.6 6.4 0 4.2-3.6 6.4 0', 'stroke-dasharray': '3.4 3' }],
];

/** Path del blob de fondo, en un viewBox de -32 -32 64 64 (handoff §3). */
export const BLOB_PATH =
  'M0,-28 C18,-28 30,-14 28,4 C26,22 12,30 -4,28 C-20,26 -30,12 -28,-6 C-26,-22 -14,-28 0,-28Z';

/** Colores de blob rotativos para miniaturas y avatares. */
export const BLOB_ROTATION = ['#F2B636', '#E9EEDD', '#F9D9C4', '#F6F0E2'] as const;

export type BlobTone =
  | 'gold'
  | 'cream'
  | 'sage'
  | 'peach'
  | 'success'
  | 'error'
  | 'warning'
  | 'paper';

export const BLOB_TONES: Record<BlobTone, string> = {
  gold: '#F2B636',
  cream: '#F6F0E2',
  sage: '#E9EEDD',
  peach: '#F9D9C4',
  success: '#DCEDDF',
  error: '#F7DEDB',
  warning: '#F7EBD2',
  paper: '#FFFDF7',
};

/** Índice estable a partir de un texto, para elegir color o rotación sin parpadeos. */
export function hashIndex(text: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h) % modulo;
}
