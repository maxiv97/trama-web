import { PackageCheck } from 'lucide-angular';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, Observable, of, startWith, switchMap, throwError } from 'rxjs';
import { Agreement } from '../../../core/models/agreement.model';
import { Garment } from '../../../core/models/garment.model';
import { SalesPoint } from '../../../core/models/sales-point.model';
import { Consignor } from '../../../core/models/user.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ReturnsService } from '../../../core/services/returns.service';
import { countdownLabel } from '../../../core/utils/deadline.util';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { TableThumb } from '../../../shared/components/data-table/data-table';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ShortDatePipe } from '../../../shared/pipes/short-date.pipe';

interface ReturnData {
  garment: Garment;
  agreement?: Agreement;
  consignor?: Consignor;
  salesPoint?: SalesPoint;
}

type PageState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ReturnData };

/**
 * Devolución de una prenda que no se vendió (Por retirar → Retirada). El comercio verifica la
 * identidad de quien la retira con el DNI del cedente y el sistema emite el comprobante.
 */
@Component({
  selector: 'app-register-return',
  imports: [TableThumb, PageSkeleton, PageHeader, ErrorState, ConfirmModal, RouterLink, ShortDatePipe],
  template: `
    @if (isLoading()) {
      <app-page-skeleton layout="form" />
    } @else if (isError()) {
      <app-error-state message="No encontramos esta prenda." link="/m/inventory" linkLabel="Volver al inventario" />
    } @else if (data(); as d) {
      <div class="mx-auto max-w-2xl space-y-6">
        <app-page-header
          title="Registrar devolución"
          section="Inventario"
          [icon]="headerIcon"
          lead="Entregá al cedente la prenda que no se vendió y dejá constancia del retiro."
        />

        @if (d.garment.status !== 'awaiting_pickup') {
          <div class="rounded-2xl border border-trama-sand-200 bg-trama-sand-50 p-5 text-sm text-trama-body">
            Esta prenda no está pendiente de retiro.
            <a [routerLink]="['/m/garment', d.garment.id]" class="font-semibold underline underline-offset-2">Ver la prenda</a>
          </div>
        } @else {
          <div class="t-card flex items-center gap-4 p-5">
            <app-table-thumb [photo]="d.garment.photos[0]" [seed]="d.garment.id" [size]="56" />
            <div class="min-w-0">
              <p class="text-title-3 truncate text-trama-dark">{{ d.garment.name }}</p>
              @if (d.garment.code) {
                <p class="text-sm text-trama-muted">{{ d.garment.code }}</p>
              }
              @if (d.agreement?.pickupDeadline; as deadline) {
                <p class="text-sm text-trama-body">
                  Plazo para retirar: hasta el {{ deadline | shortDate }} · {{ countdown(deadline) }}
                </p>
              }
            </div>
          </div>

          <div class="t-card space-y-4 p-5">
            <div>
              <p class="t-label">Cedente</p>
              <p class="text-[15px] text-trama-dark">
                {{ d.consignor?.name ?? '—' }}
                @if (d.consignor?.dni; as dni) {
                  <span class="font-bold">· DNI {{ dni }}</span>
                }
              </p>
              @if (d.salesPoint) {
                <p class="text-sm text-trama-body">Punto de venta: {{ d.salesPoint.name }}</p>
              }
            </div>
            <label class="flex cursor-pointer items-start gap-3 text-[15px] text-trama-dark">
              <input
                type="checkbox"
                class="t-check mt-0.5"
                [checked]="identityChecked()"
                (change)="identityChecked.set($any($event.target).checked)"
              />
              <span>Verifiqué el DNI de quien retira la prenda y coincide con el del cedente.</span>
            </label>
            <div>
              <label class="t-label" for="return-notes">Notas <span class="font-medium text-trama-muted">(opcional)</span></label>
              <textarea
                id="return-notes"
                rows="3"
                maxlength="500"
                class="t-input"
                placeholder="Por ejemplo, quién la retiró si no fue el cedente en persona."
                [value]="notes()"
                (input)="notes.set($any($event.target).value)"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              class="t-btn t-btn-primary"
              [disabled]="!identityChecked() || acting()"
              (click)="confirming.set(true)"
            >
              {{ acting() ? 'Registrando…' : 'Registrar devolución' }}
            </button>
          </div>
        }
      </div>

      <app-confirm-modal
        [open]="confirming()"
        title="Registrar devolución"
        body="La prenda quedará como Retirada y se generará el comprobante de devolución. ¿Confirmás que el cedente la retiró?"
        confirmLabel="Registrar"
        (confirmed)="register()"
        (cancelled)="confirming.set(false)"
      />
    }
  `,
})
export class RegisterReturn {
  protected readonly headerIcon = PackageCheck;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly garmentsService = inject(GarmentsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly returnsService = inject(ReturnsService);
  private readonly toast = inject(ToastService);

  protected readonly identityChecked = signal(false);
  protected readonly notes = signal('');
  protected readonly confirming = signal(false);
  protected readonly acting = signal(false);

  private readonly garmentId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  private readonly state = toSignal(
    this.route.paramMap.pipe(
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

  protected countdown(deadline: Date): string {
    return countdownLabel(deadline);
  }

  protected register(): void {
    this.confirming.set(false);
    const data = this.data();
    if (!data || !this.identityChecked() || this.acting()) return;
    this.acting.set(true);
    this.returnsService
      .create({
        garmentId: data.garment.id,
        identityChecked: true,
        notes: this.notes().trim() || undefined,
      })
      .subscribe({
        next: (created) => {
          this.toast.show(`Devolución registrada · ${created.receiptNumber}`);
          this.router.navigate(['/m/garment', data.garment.id]);
        },
        error: () => {
          this.acting.set(false);
          this.toast.show('No pudimos registrar la devolución', 'error');
        },
      });
  }

  private load(): Observable<ReturnData> {
    const id = this.garmentId();
    return this.garmentsService.getById(id).pipe(
      switchMap((garment) => {
        if (!garment) return throwError(() => new Error(`Prenda no encontrada: ${id}`));
        return forkJoin({
          agreement: this.agreementsService.byGarment(id),
          consignor: this.consignorsService.getById(garment.consignorId),
          merchant: garment.merchantId
            ? this.merchantsService.getById(garment.merchantId)
            : of(undefined),
        }).pipe(
          map(
            ({ agreement, consignor, merchant }): ReturnData => ({
              garment,
              agreement,
              consignor,
              salesPoint: merchant?.salesPoints.find((point) => point.id === garment.salesPointId),
            }),
          ),
        );
      }),
    );
  }
}
