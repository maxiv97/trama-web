import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  throwError,
} from 'rxjs';
import { Garment, GarmentCondition } from '../../../core/models/garment.model';
import { GarmentAction } from '../../../core/state-machine/garment.state-machine';
import {
  ReceptionDiscrepancy,
  ReceptionResult,
} from '../../../core/models/reception.model';
import { Merchant } from '../../../core/models/user.model';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { ReceptionsService } from '../../../core/services/receptions.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

interface ReviewData {
  garment: Garment;
  merchant?: Merchant;
}

type PageState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ReviewData };

const CONDITION_LABELS: Record<GarmentCondition, string> = {
  new: 'Nuevo',
  very_good: 'Muy bueno',
  good: 'Bueno',
  fair: 'Regular',
};

const RESULT_OPTIONS: { value: ReceptionResult; label: string; hint: string }[] = [
  { value: 'accepted', label: 'Conforme', hint: 'Coincide con lo pactado' },
  { value: 'with_remarks', label: 'Con observaciones', hint: 'Acepto con salvedades' },
  { value: 'rejected', label: 'Rechazar', hint: 'No se puede recibir' },
];

const DISCREPANCY_OPTIONS: { value: ReceptionDiscrepancy; label: string }[] = [
  { value: 'condition', label: 'Condición inferior' },
  { value: 'damage', label: 'Daños no declarados' },
  { value: 'photo_mismatch', label: 'No coincide con fotos' },
  { value: 'measurements', label: 'Medidas distintas' },
  { value: 'accessories', label: 'Faltan accesorios/etiquetas' },
  { value: 'hygiene', label: 'Sin higienizar' },
];

const RESULT_ACTION: Record<ReceptionResult, GarmentAction> = {
  accepted: 'RECEIVE_AS_AGREED',
  with_remarks: 'RECEIVE_WITH_REMARKS',
  rejected: 'REJECT_RECEPTION',
};

@Component({
  selector: 'app-register-reception',
  imports: [RouterLink],
  template: `
    @if (isLoading()) {
      <div class="flex min-h-[60vh] items-center justify-center">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-trama-sand-200 border-t-trama-brand"
        ></div>
      </div>
    } @else if (isError()) {
      <div class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p class="text-trama-dark/70">No encontramos esta prenda.</p>
        <a
          routerLink="/m"
          class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700"
          >Volver al panel</a
        >
      </div>
    } @else if (data(); as d) {
      <div class="mx-auto max-w-2xl space-y-6">
        <h1 class="text-2xl font-semibold text-trama-dark">Registrar recepción</h1>

        <div class="rounded-2xl border border-trama-sand-200 bg-white p-4">
          <p class="font-medium text-trama-dark">{{ d.garment.name }}</p>
          <p class="text-sm text-trama-dark/60">
            Condición declarada por el cedente:
            <span class="text-trama-dark/80">{{ conditionLabel(d.garment.condition) }}</span>
          </p>
        </div>

        <div class="space-y-3">
          <p class="text-sm font-medium text-trama-dark">Resultado del control</p>
          <div class="grid gap-3 sm:grid-cols-3">
            @for (option of resultOptions; track option.value) {
              <button
                type="button"
                (click)="result.set(option.value)"
                class="rounded-xl border p-4 text-left"
                [class]="
                  result() === option.value
                    ? 'border-trama-brand bg-trama-green-50'
                    : 'border-trama-sand-200 hover:border-trama-brand'
                "
              >
                <span class="block font-medium text-trama-dark">{{ option.label }}</span>
                <span class="mt-1 block text-xs text-trama-dark/60">{{ option.hint }}</span>
              </button>
            }
          </div>
        </div>

        @if (needsDetail()) {
          <div class="space-y-4 rounded-2xl border border-trama-sand-200 bg-white p-4">
            <div>
              <p class="mb-2 text-sm font-medium text-trama-dark">Discrepancias</p>
              <div class="grid gap-2 sm:grid-cols-2">
                @for (option of discrepancyOptions; track option.value) {
                  <label class="flex items-center gap-2 text-sm text-trama-dark/80">
                    <input
                      type="checkbox"
                      [checked]="discrepancies().includes(option.value)"
                      (change)="toggleDiscrepancy(option.value)"
                    />
                    {{ option.label }}
                  </label>
                }
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-trama-dark">Detalle</label>
              <textarea
                rows="3"
                [value]="detail()"
                (input)="detail.set($any($event.target).value)"
                class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
              ></textarea>
            </div>
            <div>
              <p class="mb-1 text-sm font-medium text-trama-dark">Evidencia fotográfica</p>
              <label
                class="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-trama-sand-200 px-3 py-3 text-sm text-trama-dark/60 hover:border-trama-brand"
              >
                Subí fotos de la evidencia
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  (change)="onEvidenceSelected($event)"
                />
              </label>
              @if (evidence().length) {
                <div class="mt-3 grid grid-cols-4 gap-2">
                  @for (photo of evidence(); track $index) {
                    <div class="relative aspect-square overflow-hidden rounded-lg">
                      <img [src]="photo" alt="" class="h-full w-full object-cover" />
                      <button
                        type="button"
                        (click)="removeEvidence($index)"
                        class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
                        aria-label="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <div>
          <label class="mb-1 block text-sm font-medium text-trama-dark">Punto de venta receptor</label>
          <select
            [value]="salesPointId()"
            (change)="salesPointId.set($any($event.target).value)"
            class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
          >
            <option value="">Elegí un punto de venta</option>
            @for (point of d.merchant?.salesPoints ?? []; track point.id) {
              <option [value]="point.id">{{ point.name }} — {{ point.address }}</option>
            }
          </select>
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            (click)="confirm()"
            [disabled]="!canConfirm() || acting()"
            class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700 disabled:opacity-40"
          >
            {{ acting() ? 'Confirmando…' : 'Confirmar recepción' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class RegisterReception {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly garmentsService = inject(GarmentsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly receptionsService = inject(ReceptionsService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly toast = inject(ToastService);

  protected readonly resultOptions = RESULT_OPTIONS;
  protected readonly discrepancyOptions = DISCREPANCY_OPTIONS;

  protected readonly result = signal<ReceptionResult | null>(null);
  protected readonly discrepancies = signal<ReceptionDiscrepancy[]>([]);
  protected readonly detail = signal('');
  protected readonly evidence = signal<string[]>([]);
  protected readonly salesPointId = signal('');
  protected readonly acting = signal(false);

  protected readonly needsDetail = computed(
    () => this.result() === 'with_remarks' || this.result() === 'rejected',
  );

  protected readonly canConfirm = computed(() => {
    const result = this.result();
    if (!result || !this.salesPointId()) return false;
    if (result === 'accepted') return true;
    return this.discrepancies().length > 0 && this.detail().trim().length > 0;
  });

  private readonly garmentId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): PageState => ({ status: 'loaded', data })),
          startWith<PageState>({ status: 'loading', data: null }),
          catchError((): Observable<PageState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as PageState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected conditionLabel(condition: GarmentCondition): string {
    return CONDITION_LABELS[condition];
  }

  protected toggleDiscrepancy(value: ReceptionDiscrepancy): void {
    this.discrepancies.update((list) =>
      list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
    );
  }

  protected onEvidenceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    Array.from(input.files ?? [])
      .filter((file) => file.type.startsWith('image/'))
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => this.evidence.update((list) => [...list, reader.result as string]);
        reader.readAsDataURL(file);
      });
    input.value = '';
  }

  protected removeEvidence(index: number): void {
    this.evidence.update((list) => list.filter((_, i) => i !== index));
  }

  protected confirm(): void {
    const data = this.data();
    const result = this.result();
    if (!data || !result || !this.canConfirm() || this.acting()) return;

    const garment = data.garment;
    const now = new Date();
    const detail = this.detail().trim();

    this.acting.set(true);
    this.garmentsService
      .applyAction(garment.id, RESULT_ACTION[result], 'merchant', this.actionNote(result))
      .pipe(
        switchMap(() =>
          this.receptionsService.create({
            id: `rec-${Date.now()}`,
            garmentId: garment.id,
            receivedAt: now,
            salesPointId: this.salesPointId(),
            result,
            discrepancies: this.discrepancies(),
            detail: detail || undefined,
            evidence: this.evidence(),
            receiptNumber: `REC-${Date.now()}`,
            handledBy: data.merchant?.name ?? 'Comercio',
          }),
        ),
        switchMap(() =>
          result === 'accepted'
            ? of(null)
            : this.notificationsService.create({
                id: `not-${Date.now()}`,
                userId: garment.consignorId,
                type: 'reception',
                text:
                  result === 'rejected'
                    ? `El comercio rechazó la recepción de ${garment.name}.`
                    : `El comercio recibió ${garment.name} con observaciones.`,
                date: now,
                read: false,
                target: garment.id,
              }),
        ),
      )
      .subscribe({
        next: () => {
          this.toast.show('Recepción registrada');
          this.router.navigate(['/m/garment', garment.id]);
        },
        error: () => {
          this.acting.set(false);
          this.toast.show('No pudimos registrar la recepción', 'error');
        },
      });
  }

  private actionNote(result: ReceptionResult): string {
    if (result === 'accepted') return 'Recibida conforme';
    if (result === 'with_remarks') return 'Recibida con observaciones';
    return 'Recepción rechazada';
  }

  private load(): Observable<ReviewData> {
    const id = this.garmentId();
    return this.garmentsService.getById(id).pipe(
      switchMap((garment) => {
        if (!garment) return throwError(() => new Error(`Prenda no encontrada: ${id}`));
        return forkJoin({
          merchant: garment.merchantId
            ? this.merchantsService.getById(garment.merchantId)
            : of(undefined),
        }).pipe(map(({ merchant }): ReviewData => ({ garment, merchant })));
      }),
    );
  }
}
