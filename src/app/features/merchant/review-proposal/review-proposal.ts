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
import { Proposal } from '../../../core/models/proposal.model';
import { Consignor, Merchant } from '../../../core/models/user.model';
import { AgreementsService } from '../../../core/services/agreements.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { ConfirmModal } from '../../../shared/components/confirm-modal/confirm-modal';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { PhotoGallery } from '../../../shared/components/photo-gallery/photo-gallery';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { calculateSalePrice } from '../../../core/utils/price.util';

interface ReviewData {
  proposal: Proposal;
  garment: Garment;
  consignor?: Consignor;
  merchant?: Merchant;
}

type ReviewState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: ReviewData };

@Component({
  selector: 'app-review-proposal',
  imports: [PhotoGallery, ConfirmModal, MoneyPipe, LoadingSpinner, ErrorState],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No encontramos esta propuesta." link="/m" linkLabel="Volver al panel" />
    } @else if (data(); as d) {
      <div class="space-y-6">
        <h1 class="text-2xl font-semibold text-trama-dark">Revisar propuesta</h1>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="space-y-4">
            <app-photo-gallery [photos]="d.garment.photos" />

            <div class="t-card p-5">
              <h2 class="text-lg font-semibold text-trama-dark">{{ d.garment.name }}</h2>
              <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt class="text-trama-dark/50">Categoría</dt>
                  <dd class="text-trama-dark/80">
                    {{ d.garment.category }}@if (d.garment.subcategory) {
                      · {{ d.garment.subcategory }}
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-trama-dark/50">Marca</dt>
                  <dd class="text-trama-dark/80">{{ d.garment.brand }}</dd>
                </div>
                <div>
                  <dt class="text-trama-dark/50">Talle</dt>
                  <dd class="text-trama-dark/80">{{ d.garment.size }}</dd>
                </div>
                <div>
                  <dt class="text-trama-dark/50">Color</dt>
                  <dd class="text-trama-dark/80">{{ d.garment.color }}</dd>
                </div>
                <div>
                  <dt class="text-trama-dark/50">Temporada</dt>
                  <dd class="text-trama-dark/80">{{ d.garment.season }}</dd>
                </div>
                <div>
                  <dt class="text-trama-dark/50">Condición</dt>
                  <dd class="text-trama-dark/80">{{ conditionLabel(d.garment.condition) }}</dd>
                </div>
              </dl>
              @if (d.garment.description) {
                <p class="mt-3 text-sm text-trama-dark/70">{{ d.garment.description }}</p>
              }
              <p class="mt-3 text-sm text-trama-dark/50">
                Cedente: <span class="text-trama-dark/80">{{ d.consignor?.name ?? '—' }}</span>
              </p>
            </div>
          </div>

          <div class="t-card space-y-4 p-5">
            <h2 class="text-sm font-medium text-trama-dark/60">Decisión</h2>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-trama-dark/70">El cedente pide</span>
                <span class="font-semibold text-trama-dark">
                  {{ d.proposal.requestedConsignorPrice | money }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-trama-dark/70">Se vendería a</span>
                <span class="font-semibold text-trama-dark">
                  {{ d.proposal.calculatedSalePrice | money }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-trama-dark/70">Comisión del comercio</span>
                <span class="font-semibold text-trama-dark">
                  {{ d.merchant?.commissionConfig?.merchantPercentage }}%
                </span>
              </div>
            </div>

            @if (countering()) {
              <div class="space-y-3 rounded-xl bg-trama-sand-50 p-4">
                <label class="block text-sm font-medium text-trama-dark">
                  Nuevo precio para el cedente
                </label>
                <input
                  type="number"
                  min="1"
                  [value]="counterPrice() ?? ''"
                  (input)="counterPrice.set(toNumber($event))"
                  class="t-input w-full"
                />
                @if (counterSalePrice() !== null) {
                  <p class="text-sm text-trama-dark/70">
                    Se vendería a
                    <span class="font-semibold text-trama-brand">{{ counterSalePrice() | money }}</span>
                  </p>
                }
                <div class="flex gap-2">
                  <button
                    type="button"
                    (click)="sendCounteroffer()"
                    [disabled]="!counterValid() || acting()"
                    class="t-btn t-btn-primary"
                  >
                    Enviar contraoferta
                  </button>
                  <button
                    type="button"
                    (click)="countering.set(false)"
                    class="t-btn t-btn-ghost"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            } @else {
              <div class="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  (click)="activeModal.set('accept')"
                  [disabled]="acting()"
                  class="t-btn t-btn-primary"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  (click)="startCounteroffer(d.proposal.requestedConsignorPrice)"
                  [disabled]="acting()"
                  class="t-btn t-btn-secondary"
                >
                  Contraofertar
                </button>
                <button
                  type="button"
                  (click)="activeModal.set('reject')"
                  [disabled]="acting()"
                  class="t-btn border-status-none/40 text-status-none hover:bg-status-none-soft"
                >
                  Rechazar
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      <app-confirm-modal
        [open]="activeModal() !== null"
        [title]="modalTitle()"
        [body]="modalBody()"
        [confirmLabel]="modalConfirmLabel()"
        [confirmColor]="modalColor()"
        [optionalField]="modalField()"
        (confirmed)="onConfirmed($event)"
        (cancelled)="activeModal.set(null)"
      />
    }
  `,
})
export class ReviewProposal {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly proposalsService = inject(ProposalsService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly agreementsService = inject(AgreementsService);
  private readonly toast = inject(ToastService);

  private readonly proposalId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: '' },
  );

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): ReviewState => ({ status: 'loaded', data })),
          startWith<ReviewState>({ status: 'loading', data: null }),
          catchError((): Observable<ReviewState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as ReviewState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  protected readonly activeModal = signal<'accept' | 'reject' | null>(null);
  protected readonly countering = signal(false);
  protected readonly counterPrice = signal<number | null>(null);
  protected readonly acting = signal(false);

  protected readonly counterSalePrice = computed(() => {
    const price = this.counterPrice();
    const merchant = this.data()?.merchant;
    if (!price || price <= 0 || !merchant) return null;
    return calculateSalePrice(price, merchant.commissionConfig.consignorPercentage);
  });

  protected readonly counterValid = computed(() => (this.counterPrice() ?? 0) > 0);

  protected readonly modalTitle = computed(() =>
    this.activeModal() === 'reject' ? 'Rechazar propuesta' : 'Aceptar propuesta',
  );
  protected readonly modalBody = computed(() =>
    this.activeModal() === 'reject'
      ? 'Vas a rechazar esta propuesta. Quedará sin acuerdo.'
      : 'Vas a aceptar el precio propuesto y se generará el acuerdo.',
  );
  protected readonly modalConfirmLabel = computed(() =>
    this.activeModal() === 'reject' ? 'Rechazar' : 'Aceptar',
  );
  protected readonly modalColor = computed<'green' | 'red' | 'blue'>(() =>
    this.activeModal() === 'reject' ? 'red' : 'green',
  );
  protected readonly modalField = computed(() =>
    this.activeModal() === 'reject' ? 'Motivo (opcional)' : undefined,
  );

  protected conditionLabel(condition: GarmentCondition): string {
    return CONDITION_LABELS[condition];
  }

  protected toNumber(event: Event): number | null {
    const value = (event.target as HTMLInputElement).value;
    return value ? Number(value) : null;
  }

  protected startCounteroffer(currentPrice: number): void {
    this.counterPrice.set(currentPrice);
    this.countering.set(true);
  }

  protected onConfirmed(reason?: string): void {
    const modal = this.activeModal();
    this.activeModal.set(null);
    if (modal === 'accept') this.accept();
    else if (modal === 'reject') this.reject(reason);
  }

  private accept(): void {
    const data = this.data();
    if (!data || this.acting()) return;
    const garmentId = data.garment.id;

    this.acting.set(true);
    this.proposalsService.accept(garmentId).subscribe({
      next: () => {
        this.toast.show('Propuesta aceptada');
        this.router.navigate(['/m/garment', garmentId]);
      },
      error: () => this.onActionError(),
    });
  }

  protected sendCounteroffer(): void {
    const data = this.data();
    const price = this.counterPrice();
    if (!data || !price || price <= 0 || this.acting()) return;
    const garmentId = data.garment.id;

    this.acting.set(true);
    this.proposalsService.counteroffer(garmentId, price).subscribe({
      next: () => {
        this.toast.show('Contraoferta enviada');
        this.router.navigate(['/m']);
      },
      error: () => this.onActionError(),
    });
  }

  private reject(_reason?: string): void {
    const data = this.data();
    if (!data || this.acting()) return;
    const garmentId = data.garment.id;

    this.acting.set(true);
    this.proposalsService.reject(garmentId).subscribe({
      next: () => {
        this.toast.show('Propuesta rechazada');
        this.router.navigate(['/m']);
      },
      error: () => this.onActionError(),
    });
  }

  private onActionError(): void {
    this.acting.set(false);
    this.toast.show('No pudimos completar la acción', 'error');
  }

  private load(): Observable<ReviewData> {
    const id = this.proposalId();
    return this.proposalsService.getById(id).pipe(
      switchMap((proposal) => {
        if (!proposal) return throwError(() => new Error(`Propuesta no encontrada: ${id}`));
        return this.garmentsService.getById(proposal.garmentId).pipe(
          switchMap((garment) => {
            if (!garment) return throwError(() => new Error('Prenda no encontrada'));
            return forkJoin({
              consignor: this.consignorsService.getById(garment.consignorId),
              merchant: garment.merchantId
                ? this.merchantsService.getById(garment.merchantId)
                : of(undefined),
            }).pipe(
              map(({ consignor, merchant }): ReviewData => ({ proposal, garment, consignor, merchant })),
            );
          }),
        );
      }),
    );
  }
}
