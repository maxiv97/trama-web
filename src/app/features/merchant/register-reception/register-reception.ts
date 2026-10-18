import { PhotoUploader } from '../../../shared/components/photo-uploader/photo-uploader';
import { TableThumb } from '../../../shared/components/data-table/data-table';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
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
import { CONDITION_LABELS } from '../../../core/models/garment.labels';
import { Garment, GarmentCondition } from '../../../core/models/garment.model';
import { GarmentAction } from '../../../core/state-machine/garment.state-machine';
import { DISCREPANCY_OPTIONS } from '../../../core/models/reception.labels';
import {
  ReceptionDiscrepancy,
  ReceptionResult,
} from '../../../core/models/reception.model';
import { Merchant } from '../../../core/models/user.model';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ReceptionsService } from '../../../core/services/receptions.service';
import { compressImage } from '../../../core/utils/image.util';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { Hanger } from '../../../shared/icons/trama-icons';
import { Dropdown, DropdownOption } from '../../../shared/components/dropdown/dropdown';

interface ReviewData {
  garment: Garment;
  merchant?: Merchant;
}

type PageState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ReviewData };

const RESULT_OPTIONS: { value: ReceptionResult; label: string; hint: string }[] = [
  { value: 'accepted', label: 'Conforme', hint: 'Coincide con lo pactado' },
  { value: 'with_remarks', label: 'Con observaciones', hint: 'Acepto con salvedades' },
  { value: 'rejected', label: 'Rechazar', hint: 'No se puede recibir' },
];

const RESULT_ACTION: Record<ReceptionResult, GarmentAction> = {
  accepted: 'RECEIVE_AS_AGREED',
  with_remarks: 'RECEIVE_WITH_REMARKS',
  rejected: 'REJECT_RECEPTION',
};

@Component({
  selector: 'app-register-reception',
  styles: `
    .opt {
      border: 2px solid var(--color-trama-sand-100);
      background: var(--color-trama-paper);
      transition: border-color 150ms, background-color 150ms;
    }
    .opt:hover {
      border-color: var(--color-trama-thread-light);
    }
    .opt-on,
    .opt-on:hover {
      border-color: var(--color-trama-dark);
      background: var(--color-trama-sand-50);
    }
  `,
  imports: [PhotoUploader, TableThumb, Dropdown, PageSkeleton, PageHeader, ErrorState],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="form" />
    } @else if (isError()) {
      <app-error-state message="No encontramos esta prenda." link="/m" linkLabel="Volver al panel" />
    } @else if (data(); as d) {
      <div class="mx-auto max-w-2xl space-y-6">
        <app-page-header title="Registrar recepción" section="Inventario" [icon]="headerIcon" lead="Revisá la prenda que te trajeron y confirmá en qué estado llegó." />

        <div class="t-card flex items-center gap-4 p-5">
          <app-table-thumb [photo]="d.garment.photos[0]" [seed]="d.garment.id" [size]="56" />
          <div class="min-w-0">
            <p class="text-title-3 truncate text-trama-dark">{{ d.garment.name }}</p>
            <p class="text-sm text-trama-body">
              Estado declarado por el cedente: <strong class="text-trama-dark">{{ conditionLabel(d.garment.condition) }}</strong>
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <p class="t-label">Resultado del control</p>
          <div class="grid gap-3 sm:grid-cols-3">
            @for (option of resultOptions; track option.value) {
              <button
                type="button"
                (click)="result.set(option.value)"
                role="radio"
                [attr.aria-checked]="result() === option.value"
                class="opt rounded-2xl p-4 text-left"
                [class.opt-on]="result() === option.value"
              >
                <span class="block text-[15px] font-bold text-trama-dark">{{ option.label }}</span>
                <span class="mt-1 block text-[13px] text-trama-body">{{ option.hint }}</span>
              </button>
            }
          </div>
        </div>

        @if (needsDetail()) {
          <div class="t-card space-y-5 p-5">
            <div>
              <p class="t-label">Discrepancias</p>
              <div class="grid gap-2 sm:grid-cols-2">
                @for (option of discrepancyOptions; track option.value) {
                  <label class="flex cursor-pointer items-center gap-2.5 text-[15px] text-trama-dark">
                    <input
                      type="checkbox"
                      class="t-check"
                      [checked]="discrepancies().includes(option.value)"
                      (change)="toggleDiscrepancy(option.value)"
                    />
                    {{ option.label }}
                  </label>
                }
              </div>
            </div>
            <div>
              <label class="t-label">Detalle</label>
              <textarea
                rows="3"
                [value]="detail()"
                (input)="detail.set($any($event.target).value)"
                class="t-input"
              ></textarea>
            </div>
            <div>
              <p class="t-label">Evidencia fotográfica <span class="font-medium text-trama-muted">(opcional)</span></p>
              <app-photo-uploader [(photos)]="evidence" [max]="4" [suggestions]="['Evidencia', 'Detalle', 'Otra', 'Otra']" />
            </div>
          </div>
        }

        <div>
          <label class="t-label">Punto de venta receptor</label>
          <app-dropdown
            placeholder="Elegí un punto de venta"
            ariaLabel="Punto de venta receptor"
            [options]="salesPointOptions(d.merchant?.salesPoints ?? [])"
            [value]="salesPointId()"
            (valueChange)="salesPointId.set($event)"
          />
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            (click)="confirm()"
            [disabled]="!canConfirm() || acting()"
            class="t-btn t-btn-primary"
          >
            {{ acting() ? 'Confirmando…' : 'Confirmar recepción' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class RegisterReception {
  protected salesPointOptions(points: { id: string; name: string; address: string }[]): DropdownOption[] {
    return points.map((p) => ({ value: p.id, label: p.name, hint: p.address }));
  }

  protected readonly headerIcon = Hanger;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly garmentsService = inject(GarmentsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly receptionsService = inject(ReceptionsService);
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
        compressImage(file)
          .then((image) => this.evidence.update((list) => [...list, image]))
          .catch(() => this.toast.show('No pudimos procesar una de las imágenes', 'error'));
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
    const detail = this.detail().trim();

    this.acting.set(true);
    this.receptionsService
      .create({
        garmentId: garment.id,
        salesPointId: this.salesPointId(),
        result,
        discrepancies: this.discrepancies(),
        detail: detail || undefined,
        evidence: this.evidence(),
      })
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
