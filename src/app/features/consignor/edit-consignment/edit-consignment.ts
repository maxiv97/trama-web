import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  forkJoin,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { Category } from '../../../core/models/category.model';
import { CONDITION_LABELS } from '../../../core/models/garment.labels';
import { Garment, GarmentCondition } from '../../../core/models/garment.model';
import { SEASONS } from '../../../core/models/garment-taxonomy';
import { Proposal } from '../../../core/models/proposal.model';
import { Merchant } from '../../../core/models/user.model';
import { CategoriesService } from '../../../core/services/categories.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { calculateSalePrice } from '../../../core/utils/price.util';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

interface EditData {
  garment: Garment;
  proposal: Proposal | undefined;
  merchant: Merchant;
  categories: Category[];
}

type EditState =
  | { status: 'loading'; data: null }
  | { status: 'error'; data: null }
  | { status: 'loaded'; data: EditData };

const CONDITION_OPTIONS = (Object.keys(CONDITION_LABELS) as GarmentCondition[]).map((value) => ({
  value,
  label: CONDITION_LABELS[value],
}));

@Component({
  selector: 'app-edit-consignment',
  imports: [ReactiveFormsModule, RouterLink, MoneyPipe, LoadingSpinner, ErrorState],
  template: `
    @if (isLoading()) {
      <app-loading-spinner />
    } @else if (isError()) {
      <app-error-state message="No pudimos cargar la consignación." (retry)="retry()" />
    } @else if (data(); as d) {
      <div class="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 class="text-2xl font-semibold text-trama-dark">Editar consignación</h1>
          <p class="mt-1 text-sm text-trama-dark/60">
            Propuesta para
            <span class="font-medium text-trama-dark">{{ d.merchant.businessName }}</span>.
            Podés corregirla hasta que el comercio la revise.
          </p>
        </div>

        @if (d.garment.status !== 'under_review') {
          <div class="rounded-2xl border border-trama-sand-200 bg-white p-6 text-sm text-trama-dark/80">
            El comercio ya revisó esta propuesta, así que no se puede editar.
            <a
              [routerLink]="['/c/garment', d.garment.id]"
              class="font-medium text-trama-brand underline"
            >
              Volver al seguimiento
            </a>
          </div>
        } @else {
          <section class="rounded-2xl border border-trama-sand-200 bg-white p-6">
            <h2 class="mb-3 text-sm font-semibold text-trama-dark">Fotos</h2>
            <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
              @for (photo of photos(); track $index) {
                <div class="aspect-square overflow-hidden rounded-lg">
                  <img [src]="photo" alt="" class="h-full w-full object-cover" />
                </div>
              }
            </div>
          </section>

          <form [formGroup]="form" class="space-y-6">
            <section
              class="grid grid-cols-1 gap-4 rounded-2xl border border-trama-sand-200 bg-white p-6 sm:grid-cols-2"
            >
              <h2 class="text-sm font-semibold text-trama-dark sm:col-span-2">Datos de la prenda</h2>
              <div class="sm:col-span-2">
                <label class="mb-1 block text-sm font-medium text-trama-dark">Nombre</label>
                <input
                  formControlName="name"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-trama-dark">Categoría</label>
                <select
                  formControlName="category"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                >
                  <option value="">Elegí una categoría</option>
                  @for (category of d.categories; track category.label) {
                    <option [value]="category.label">{{ category.label }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-trama-dark">Subcategoría</label>
                <select
                  formControlName="subcategory"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                >
                  <option value="">Elegí una subcategoría</option>
                  @for (subcategory of subcategories(); track subcategory) {
                    <option [value]="subcategory">{{ subcategory }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-trama-dark">Marca</label>
                <input
                  formControlName="brand"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-trama-dark">Talle</label>
                <input
                  formControlName="size"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-trama-dark">Color</label>
                <input
                  formControlName="color"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-trama-dark">Temporada</label>
                <select
                  formControlName="season"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                >
                  <option value="">Elegí una temporada</option>
                  @for (season of seasons; track season) {
                    <option [value]="season">{{ season }}</option>
                  }
                </select>
              </div>
              <div class="sm:col-span-2">
                <span class="mb-1 block text-sm font-medium text-trama-dark">Condición</span>
                <div class="flex flex-wrap gap-3">
                  @for (condition of conditions; track condition.value) {
                    <label class="flex items-center gap-2 text-sm text-trama-dark/80">
                      <input type="radio" formControlName="condition" [value]="condition.value" />
                      {{ condition.label }}
                    </label>
                  }
                </div>
              </div>
              <div class="sm:col-span-2">
                <label class="mb-1 block text-sm font-medium text-trama-dark"
                  >Descripción <span class="text-trama-dark/40">(opcional)</span></label
                >
                <textarea
                  formControlName="description"
                  rows="3"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                ></textarea>
              </div>
            </section>

            <section class="space-y-4 rounded-2xl border border-trama-sand-200 bg-white p-6">
              <h2 class="text-sm font-semibold text-trama-dark">Precio</h2>
              <div>
                <label class="mb-1 block text-sm font-medium text-trama-dark"
                  >¿Cuánto querés recibir?</label
                >
                <input
                  type="number"
                  formControlName="consignorPrice"
                  min="1"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                />
              </div>
              @if (salePrice() !== null) {
                <div class="rounded-xl bg-trama-sand-50 p-4 text-sm text-trama-dark/80">
                  El comercio lo venderá a
                  <span class="font-semibold text-trama-brand">{{ salePrice() | money }}</span>
                </div>
              }
            </section>
          </form>

          <div class="flex justify-end">
            <a
              [routerLink]="['/c/garment', d.garment.id]"
              class="rounded-lg px-4 py-2 text-sm font-medium text-trama-dark/70 hover:bg-trama-sand-100"
            >
              Cancelar
            </a>
          </div>
        }
      </div>
    }
  `,
})

export class EditConsignment {
  private readonly fb = inject(FormBuilder);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly categoriesService = inject(CategoriesService);

  private readonly garmentId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly seasons = SEASONS;
  protected readonly conditions = CONDITION_OPTIONS;
  protected readonly photos = signal<string[]>([]);

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    subcategory: ['', Validators.required],
    brand: ['', Validators.required],
    size: ['', Validators.required],
    color: ['', Validators.required],
    season: ['', Validators.required],
    condition: ['', Validators.required],
    description: [''],
    consignorPrice: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  private readonly reload = new BehaviorSubject<void>(undefined);

  private readonly state = toSignal(
    this.reload.pipe(
      switchMap(() =>
        this.load().pipe(
          map((data): EditState => ({ status: 'loaded', data })),
          startWith<EditState>({ status: 'loading', data: null }),
          catchError((): Observable<EditState> => of({ status: 'error', data: null })),
        ),
      ),
    ),
    { initialValue: { status: 'loading', data: null } as EditState },
  );

  protected readonly isLoading = computed(() => this.state().status === 'loading');
  protected readonly isError = computed(() => this.state().status === 'error');
  protected readonly data = computed(() => {
    const current = this.state();
    return current.status === 'loaded' ? current.data : null;
  });

  private readonly categoryValue = toSignal(this.form.controls.category.valueChanges, {
    initialValue: this.form.controls.category.value,
  });
  private readonly priceValue = toSignal(this.form.controls.consignorPrice.valueChanges, {
    initialValue: this.form.controls.consignorPrice.value,
  });

  protected readonly subcategories = computed(
    () =>
      this.data()?.categories.find((category) => category.label === this.categoryValue())
        ?.subcategories ?? [],
  );

  protected readonly salePrice = computed(() => {
    const price = Number(this.priceValue());
    const merchant = this.data()?.merchant;
    if (!price || !merchant) return null;
    return calculateSalePrice(price, merchant.commissionConfig.consignorPercentage);
  });

  constructor() {
    this.form.controls.category.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.subcategory.setValue(''));
  }

  protected retry(): void {
    this.reload.next();
  }

  private load(): Observable<EditData> {
    return this.garmentsService.getById(this.garmentId).pipe(
      switchMap((garment) =>
        forkJoin({
          proposal: this.proposalsService.byGarment(garment.id),
          merchant: this.merchantsService.getById(garment.merchantId ?? ''),
          categories: this.categoriesService.forMerchant(garment.merchantId),
        }).pipe(
          map(({ proposal, merchant, categories }) => {
            if (!proposal && garment.status === 'under_review') {
              throw new Error('La prenda no tiene propuesta');
            }
            return { garment, proposal, merchant, categories };
          }),
        ),
      ),
      tap((data) => this.fillForm(data)),
    );
  }

  private fillForm({ garment, proposal }: EditData): void {
    this.form.patchValue({
      name: garment.name,
      category: garment.category,
      subcategory: garment.subcategory ?? '',
      brand: garment.brand,
      size: garment.size,
      color: garment.color,
      season: garment.season,
      condition: garment.condition,
      description: garment.description ?? '',
      consignorPrice: proposal?.requestedConsignorPrice ?? null,
    });
    this.photos.set(garment.photos);
  }
}
