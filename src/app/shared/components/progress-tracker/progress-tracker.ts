import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { GarmentStatus } from '../../../core/models/garment.model';
import { Seam } from '../seam/seam';
import { SeamSummary } from './seam-summary';

const STEPS = [
  'Cargada',
  'En revisión',
  'Acordada',
  'Recepcionada',
  'En stock',
  'Vendida',
  'Liquidada',
] as const;

// Recorrido alternativo de una prenda que no se vendió: termina en el retiro.
const UNSOLD_STEPS = [
  'Cargada',
  'En revisión',
  'Acordada',
  'Recepcionada',
  'En stock',
  'Por retirar',
  'Retirada',
] as const;
const UNCLAIMED_STEPS = [...UNSOLD_STEPS.slice(0, 6), 'No retirada'] as const;

const STEP_INDEX: Record<GarmentStatus, number> = {
  submitted: 0,
  under_review: 1,
  counteroffer: 1,
  no_agreement: 1,
  agreed: 2,
  rejected: 3,
  in_stock: 4,
  with_remarks: 4,
  sold: 5,
  paid_out: 6,
  cancelled: 1,
  delivery_expired: 2,
  awaiting_pickup: 5,
  returned: 6,
  unclaimed: 6,
};

// Resultados negativos: el anillo del paso actual pasa a rojo.
const NEGATIVE: Partial<Record<GarmentStatus, boolean>> = {
  no_agreement: true,
  rejected: true,
  delivery_expired: true,
  unclaimed: true,
};

// Estados finales: no hay un paso siguiente esperado.
const TERMINAL: Partial<Record<GarmentStatus, boolean>> = {
  no_agreement: true,
  rejected: true,
  cancelled: true,
  delivery_expired: true,
  returned: true,
  unclaimed: true,
};

function stepsFor(status: GarmentStatus): readonly string[] {
  if (status === 'unclaimed') return UNCLAIMED_STEPS;
  if (status === 'awaiting_pickup' || status === 'returned') return UNSOLD_STEPS;
  return STEPS;
}

const RADIUS = 22;

/**
 * Recorrido de la prenda (handoff §4.7): la costura de trazabilidad en 7 pasos.
 *
 * Cuando el contenedor es angosto y los anillos de la costura grande se pisarían
 * (handoff "Recorrido mobile", opción 1b), muestra el resumen con la costura mini y
 * el recorrido completo desplegable. Se decide por el ancho del contenedor y no por
 * el del viewport, porque el tracker vive dentro de grillas de distinto ancho.
 */
@Component({
  selector: 'app-progress-tracker',
  imports: [Seam, SeamSummary],
  host: { class: 'block' },
  template: `
    @if (width() > 0) {
      @if (compact()) {
        <app-seam-summary
          [steps]="steps()"
          [current]="currentIndex()"
          [negative]="isNegative()"
          [terminal]="isTerminal()"
        />
      } @else {
        <app-seam
          [steps]="steps()"
          [current]="currentIndex()"
          [negative]="isNegative()"
          [radius]="radius"
          [compactLabels]="true"
        />
      }
    }
  `,
})
export class ProgressTracker {
  readonly currentStatus = input.required<GarmentStatus>();
  protected readonly steps = computed(() => stepsFor(this.currentStatus()));
  protected readonly radius = RADIUS;
  protected readonly currentIndex = computed(() => STEP_INDEX[this.currentStatus()]);
  protected readonly isNegative = computed(() => NEGATIVE[this.currentStatus()] ?? false);
  protected readonly isTerminal = computed(() => TERMINAL[this.currentStatus()] ?? false);

  protected readonly width = signal(0);
  /** La costura grande no entra si la separación entre botones es menor que el anillo + 8 px. */
  readonly compact = computed(() => isCompact(this.width(), STEPS.length, RADIUS));

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.width.set(el.getBoundingClientRect().width);
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver((entries) => {
          const w = entries[0]?.contentRect.width ?? 0;
          if (Math.abs(w - this.width()) > 0.5) this.width.set(w);
        });
        ro.observe(el);
        destroyRef.onDestroy(() => ro.disconnect());
      }
    });
  }
}

/** Regla del handoff: `(ancho − 2·pad) / (n − 1) < diámetro del anillo + 8`, con el pad de `Seam`. */
export function isCompact(width: number, steps: number, radius: number): boolean {
  if (width <= 0 || steps < 2) return false;
  const pad = Math.round(radius * 1.5) + 4;
  const ringDiameter = radius * 1.36 * 2;
  const spacing = (width - 2 * pad) / (steps - 1);
  return spacing < ringDiameter + 8;
}
