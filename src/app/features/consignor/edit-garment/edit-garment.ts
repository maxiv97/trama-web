import { Shirt } from 'lucide-angular';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, forkJoin, of, switchMap } from 'rxjs';
import { Category } from '../../../core/models/category.model';
import { GarmentCondition } from '../../../core/models/garment.model';
import { CategoriesService } from '../../../core/services/categories.service';
import { GarmentsService } from '../../../core/services/garments.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { PhotoUploader } from '../../../shared/components/photo-uploader/photo-uploader';
import { SEASONS } from '../../../core/models/garment-taxonomy';
import { calculateSalePrice } from '../../../core/utils/price.util';
import { compressImage } from '../../../core/utils/image.util';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageSkeleton } from '../../../shared/components/page-skeleton/page-skeleton';
import { Dropdown, DropdownOption } from '../../../shared/components/dropdown/dropdown';

const CONDITIONS: { value: GarmentCondition; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'very_good', label: 'Muy bueno' },
  { value: 'good', label: 'Bueno' },
  { value: 'fair', label: 'Regular' },
];

@Component({
  selector: 'app-edit-garment',
  imports: [PhotoUploader, Dropdown, PageSkeleton, PageHeader, ReactiveFormsModule, RouterLink, MoneyPipe, ErrorState],
  template: `
    @if (loading()) {
      <app-page-skeleton layout="form" />
    } @else if (error()) {
      <app-error-state message="No pudimos cargar la consignación." link="/c" linkLabel="Volver al panel" />
    } @else {
      <div class="mx-auto max-w-2xl space-y-6">
        <app-page-header title="Editar consignación" section="Mis prendas" [icon]="headerIcon" lead="Mientras está en revisión podés corregir las fotos, los datos y el precio." />

        <div class="t-card space-y-6 p-6 sm:p-8">
          <!-- Fotos -->
          <div>
            <span class="t-label">Fotos</span>
            <app-photo-uploader [(photos)]="photos" [invalid]="showErrors() && !photos().length" />
            @if (showErrors() && !photos().length) {
              <p class="t-error">Dejá al menos una foto.</p>
            }
          </div>

          <form [formGroup]="form" class="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="t-label">Nombre</label>
              <input formControlName="name" [class]="inputClass" />
              @if (showError('name')) {
                <p class="t-error">{{ errorMessage('name') }}</p>
              }
            </div>
            <div>
              <label class="t-label">Categoría</label>
              <app-dropdown formControlName="category" placeholder="Elegí una categoría" ariaLabel="Categoría" [invalid]="showError('category')"
                [options]="categoryOptions()" />
              @if (showError('category')) {
                <p class="t-error">{{ errorMessage('category') }}</p>
              }
            </div>
            <div>
              <label class="t-label">Subcategoría</label>
              <app-dropdown formControlName="subcategory" placeholder="Elegí una subcategoría" ariaLabel="Subcategoría" [invalid]="showError('subcategory')"
                [options]="subcategoryOptions()" />
              @if (showError('subcategory')) {
                <p class="t-error">{{ errorMessage('subcategory') }}</p>
              }
            </div>
            <div>
              <label class="t-label">Marca</label>
              <input formControlName="brand" [class]="inputClass" />
              @if (showError('brand')) {
                <p class="t-error">{{ errorMessage('brand') }}</p>
              }
            </div>
            <div>
              <label class="t-label">Talle</label>
              <input formControlName="size" [class]="inputClass" />
              @if (showError('size')) {
                <p class="t-error">{{ errorMessage('size') }}</p>
              }
            </div>
            <div>
              <label class="t-label">Color</label>
              <input formControlName="color" [class]="inputClass" />
              @if (showError('color')) {
                <p class="t-error">{{ errorMessage('color') }}</p>
              }
            </div>
            <div>
              <label class="t-label">Temporada</label>
              <app-dropdown formControlName="season" placeholder="Elegí una temporada" ariaLabel="Temporada" [invalid]="showError('season')"
                [options]="seasonOptions" />
              @if (showError('season')) {
                <p class="t-error">{{ errorMessage('season') }}</p>
              }
            </div>
            <div class="sm:col-span-2">
              <span class="t-label">Condición</span>
              <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Estado de la prenda">
                @for (condition of conditions; track condition.value) {
                  <button
                    type="button"
                    role="radio"
                    class="t-chip"
                    [attr.aria-checked]="form.controls.condition.value === condition.value"
                    (click)="form.controls.condition.setValue(condition.value); form.controls.condition.markAsTouched()"
                  >
                    {{ condition.label }}
                  </button>
                }
              </div>
              @if (showError('condition')) {
                <p class="t-error">Elegí la condición de la prenda.</p>
              }
            </div>
            <div class="sm:col-span-2">
              <label class="t-label"
                >Descripción <span class="text-trama-muted">(opcional)</span></label
              >
              <textarea formControlName="description" rows="3" [class]="inputClass"></textarea>
            </div>
            <div class="sm:col-span-2">
              <label class="t-label">¿Cuánto querés recibir?</label>
              <input type="number" formControlName="consignorPrice" min="1" [class]="inputClass" />
              @if (showError('consignorPrice')) {
                <p class="t-error">Ingresá un monto mayor a cero.</p>
              }
              @if (salePrice() !== null) {
                <p class="mt-2 text-sm text-trama-body">
                  El comercio lo venderá a
                  <span class="font-semibold text-trama-brand">{{ salePrice() | money }}</span>
                </p>
              }
            </div>
          </form>

          @if (submitError()) {
            <p class="t-alert" role="alert">
              {{ submitError() }}
            </p>
          }
        </div>

        <div class="flex items-center justify-between">
          <a
            [routerLink]="['/c/garment', garmentId]"
            class="t-btn t-btn-ghost"
          >
            Cancelar
          </a>
          <button
            type="button"
            (click)="save()"
            [disabled]="saving()"
            class="t-btn t-btn-primary"
          >
            {{ saving() ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class EditGarment {
  protected readonly categoryOptions = computed<DropdownOption[]>(() =>
    this.categories().map((c) => ({ value: c.label, label: c.label })),
  );
  protected readonly subcategoryOptions = computed<DropdownOption[]>(() =>
    this.subcategories().map((sub) => ({ value: sub, label: sub })),
  );
  protected readonly seasonOptions: DropdownOption[] = SEASONS.map((season) => ({ value: season, label: season }));

  protected readonly headerIcon = Shirt;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly inputClass =
    't-input';
  protected readonly seasons = SEASONS;
  protected readonly conditions = CONDITIONS;

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly saving = signal(false);
  protected readonly showErrors = signal(false);
  protected readonly submitError = signal('');
  protected readonly photos = signal<string[]>([]);
  protected readonly categories = signal<Category[]>([]);

  protected readonly garmentId = this.route.snapshot.paramMap.get('id') ?? '';
  private merchantId = '';
  private readonly commission = signal(0);

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

  private readonly categoryValue = toSignal(this.form.controls.category.valueChanges, {
    initialValue: this.form.controls.category.value,
  });
  private readonly priceValue = toSignal(this.form.controls.consignorPrice.valueChanges, {
    initialValue: this.form.controls.consignorPrice.value,
  });

  protected readonly subcategories = computed(
    () =>
      this.categories().find((category) => category.label === this.categoryValue())
        ?.subcategories ?? [],
  );

  protected readonly salePrice = computed(() => {
    const price = Number(this.priceValue());
    const commission = this.commission();
    if (!price || !commission) return null;
    return calculateSalePrice(price, commission);
  });

  constructor() {
    // Al cambiar de categoría (acción del usuario) se limpia la subcategoría;
    // la carga inicial usa emitEvent:false para no disparar esto.
    this.form.controls.category.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.subcategory.setValue(''));
    this.loadGarment();
  }

  private loadGarment(): void {
    // Traigo categorías y comercio ANTES de prellenar, así las opciones de
    // subcategoría ya existen y el precio de venta puede calcularse.
    this.garmentsService
      .getById(this.garmentId)
      .pipe(
        switchMap((garment) => {
          if (garment.status !== 'under_review') {
            this.toast.show('Esta consignación ya no se puede editar', 'error');
            this.router.navigate(['/c/garment', this.garmentId]);
            return EMPTY;
          }
          this.merchantId = garment.merchantId ?? '';
          return forkJoin({
            garment: of(garment),
            proposal: this.proposalsService.byGarment(this.garmentId),
            categories: this.merchantId
              ? this.categoriesService.forMerchant(this.merchantId)
              : of([]),
            merchant: this.merchantId
              ? this.merchantsService.getById(this.merchantId)
              : of(undefined),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ garment, proposal, categories, merchant }) => {
          this.categories.set(categories);
          if (merchant) this.commission.set(merchant.commissionConfig.consignorPercentage);
          this.photos.set(garment.photos ?? []);
          this.form.patchValue({
            name: garment.name,
            category: garment.category,
            brand: garment.brand,
            size: garment.size,
            color: garment.color,
            season: garment.season,
            condition: garment.condition,
            description: garment.description ?? '',
            consignorPrice: proposal?.requestedConsignorPrice ?? null,
          });
          // La subcategoría se setea después de la categoría (que al cambiar la
          // limpia), con las opciones ya cargadas.
          this.form.controls.subcategory.setValue(garment.subcategory ?? '');
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  protected showError(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || this.showErrors());
  }

  protected errorMessage(name: string): string {
    const errors = this.form.get(name)?.errors;
    if (!errors) return '';
    if (errors['required']) return 'Este campo es obligatorio.';
    if (errors['min']) return `El mínimo es ${errors['min'].min}.`;
    return 'Revisá este dato.';
  }

  protected save(): void {
    if (this.saving()) return;
    if (this.form.invalid || !this.photos().length) {
      this.showErrors.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.submitError.set('');
    this.garmentsService
      .updateDraft(this.garmentId, {
        name: raw.name ?? '',
        category: raw.category ?? '',
        subcategory: raw.subcategory ?? '',
        brand: raw.brand ?? '',
        size: raw.size ?? '',
        color: raw.color ?? '',
        season: raw.season ?? '',
        condition: raw.condition ?? '',
        description: raw.description ?? '',
        photos: this.photos(),
        requestedConsignorPrice: Number(raw.consignorPrice),
      })
      .subscribe({
        next: () => {
          this.toast.show('Consignación actualizada');
          this.router.navigate(['/c/garment', this.garmentId]);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          const message =
            err.status === 0
              ? 'No pudimos conectarnos con el servidor. Probá de nuevo.'
              : this.backendMessage(err) || 'No pudimos guardar los cambios.';
          this.submitError.set(message);
          this.toast.show(message, 'error');
        },
      });
  }

  private backendMessage(err: HttpErrorResponse): string {
    const detail = err.error?.message;
    return Array.isArray(detail) ? detail[0] : typeof detail === 'string' ? detail : '';
  }
}
