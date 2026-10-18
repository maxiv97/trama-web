import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { GarmentCondition } from '../../../core/models/garment.model';
import { GarmentsService } from '../../../core/services/garments.service';
import { ProposalsService } from '../../../core/services/proposals.service';
import { MerchantsService } from '../../../core/services/merchants.service';
import { ConsignorsService } from '../../../core/services/consignors.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { Category } from '../../../core/models/category.model';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { calculateSalePrice } from '../../../core/utils/price.util';
import { distanceKm } from '../../../core/utils/geo.util';
import { compressImage } from '../../../core/utils/image.util';
import { SEASONS } from '../../../core/models/garment-taxonomy';

interface MerchantOption {
  merchantId: string;
  salesPointId: string;
  businessName: string;
  neighborhood: string;
  commission: number;
  distance: number | null;
  scheduleDays: string;
  scheduleHours: string;
}

interface Selection {
  merchantId: string;
  salesPointId: string;
}

const CONDITIONS: { value: GarmentCondition; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'very_good', label: 'Muy bueno' },
  { value: 'good', label: 'Bueno' },
  { value: 'fair', label: 'Regular' },
];

const STEPS = ['Fotos', 'Comercio', 'Descripción', 'Precio'];

@Component({
  selector: 'app-upload-garment',
  imports: [ReactiveFormsModule, DecimalPipe, MoneyPipe],
  template: `
    <div class="mx-auto max-w-2xl space-y-6">
      <h1 class="text-2xl font-semibold text-trama-dark">Cargar artículo</h1>

      @if (submitted()) {
        <div class="t-card p-8 text-center">
          <div
            class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-trama-green-50 text-3xl text-trama-brand"
          >
            ✓
          </div>
          <h2 class="mt-4 text-title-3 text-trama-dark">¡Propuesta enviada!</h2>
          <p class="mx-auto mt-2 max-w-sm text-sm text-trama-body">
            Le llegó a <span class="font-medium text-trama-dark">{{ sentMerchantName() }}</span> para
            revisar. Te avisamos apenas responda.
          </p>
          <div class="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              (click)="reset()"
              class="t-btn t-btn-primary"
            >
              Cargar otra prenda
            </button>
            <button
              type="button"
              (click)="viewGarment()"
              class="t-btn t-btn-secondary"
            >
              Ver la propuesta
            </button>
            <button
              type="button"
              (click)="goHome()"
              class="t-btn t-btn-ghost"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      } @else {

      <ol class="flex items-center">
        @for (label of steps; track label; let i = $index; let last = $last) {
          <li class="flex items-center" [class.flex-1]="!last">
            <div class="flex flex-col items-center">
              <span
                class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
                [class]="circleClass(i + 1)"
                >{{ i + 1 }}</span
              >
              <span class="mt-1 whitespace-nowrap text-xs" [class]="labelClass(i + 1)">{{
                label
              }}</span>
            </div>
            @if (!last) {
              <span
                class="mx-2 h-0.5 flex-1"
                [class]="i + 1 < step() ? 'bg-trama-brand' : 'bg-trama-sand-200'"
              ></span>
            }
          </li>
        }
      </ol>

      <div class="t-card p-6">
        @switch (step()) {
          @case (1) {
            <div class="space-y-4">
              <p class="text-sm text-trama-body">
                Subí al menos una foto de tu prenda. Cuantas más subas, mejor podrá evaluarla el
                comercio.
              </p>
              <label
                (dragover)="$event.preventDefault()"
                (drop)="onDrop($event)"
                class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-trama-sand-200 py-10 text-center text-trama-body hover:border-trama-brand"
              >
                <span class="text-sm">Arrastrá tus fotos acá o hacé click para elegir</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  (change)="onFilesSelected($event)"
                />
              </label>
              @if (showErrors() && !photos().length) {
                <p class="text-xs text-status-none">Subí al menos una foto para continuar.</p>
              }

              @if (photos().length) {
                <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  @for (photo of photos(); track $index) {
                    <div class="relative aspect-square overflow-hidden rounded-lg">
                      <img [src]="photo" alt="" class="h-full w-full object-cover" />
                      <button
                        type="button"
                        (click)="removePhoto($index)"
                        class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                        aria-label="Eliminar foto"
                      >
                        ✕
                      </button>
                    </div>
                  }
                </div>
                <p class="text-xs text-trama-muted">{{ photos().length }} foto(s) cargada(s).</p>
              }

              <div>
                <span class="t-label">Video (opcional)</span>
                @if (videoName(); as name) {
                  <div
                    class="flex items-center justify-between rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                  >
                    <span class="truncate text-trama-body">{{ name }}</span>
                    <button
                      type="button"
                      (click)="removeVideo()"
                      class="ml-2 shrink-0 text-xs text-trama-muted hover:text-status-none"
                    >
                      Quitar
                    </button>
                  </div>
                } @else {
                  <label
                    class="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-trama-sand-200 px-3 py-3 text-sm text-trama-body hover:border-trama-brand"
                  >
                    Subí un video de tu prenda
                    <input
                      type="file"
                      accept="video/*"
                      class="hidden"
                      (change)="onVideoSelected($event)"
                    />
                  </label>
                }
              </div>
            </div>
          }
          @case (2) {
            <div class="space-y-4">
              <input
                type="search"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
                placeholder="Buscar por nombre o barrio"
                class="t-input"
              />
              @if (merchantOptions().length) {
                <div class="space-y-3">
                  @for (option of merchantOptions(); track option.merchantId) {
                    <button
                      type="button"
                      (click)="select(option)"
                      class="flex w-full flex-col gap-1 rounded-xl border p-4 text-left"
                      [class]="
                        selection()?.merchantId === option.merchantId
                          ? 'border-trama-brand bg-trama-green-50'
                          : 'border-trama-sand-200 hover:border-trama-brand'
                      "
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-medium text-trama-dark">{{ option.businessName }}</span>
                        @if (option.distance !== null) {
                          <span class="text-xs text-trama-body"
                            >{{ option.distance | number: '1.1-1' }} km</span
                          >
                        }
                      </div>
                      <span class="text-sm text-trama-body">{{ option.neighborhood }}</span>
                      <span class="text-xs text-trama-body"
                        >Comisión cedente: {{ option.commission }}% · Recepción:
                        {{ option.scheduleDays }} {{ option.scheduleHours }}</span
                      >
                    </button>
                  }
                </div>
              } @else {
                <p class="py-8 text-center text-sm text-trama-body">
                  No encontramos comercios para tu búsqueda.
                </p>
              }
              @if (showErrors() && !selection()) {
                <p class="text-xs text-status-none">Elegí un comercio para continuar.</p>
              }
            </div>
          }
          @case (3) {
            <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="t-label">Nombre</label>
                <input
                  formControlName="name"
                  placeholder="Ej: Campera de jean azul"
                  class="t-input"
                />
                @if (showError('name')) {
                  <p class="t-error">{{ errorMessage('name') }}</p>
                }
              </div>
              <div>
                <label class="t-label">Categoría</label>
                <select
                  formControlName="category"
                  class="t-input"
                >
                  <option value="">Elegí una categoría</option>
                  @for (category of categories(); track category.id) {
                    <option [value]="category.label">{{ category.label }}</option>
                  }
                </select>
                @if (showError('category')) {
                  <p class="t-error">{{ errorMessage('category') }}</p>
                }
              </div>
              <div>
                <label class="t-label">Subcategoría</label>
                <select
                  formControlName="subcategory"
                  class="t-input"
                >
                  <option value="">Elegí una subcategoría</option>
                  @for (subcategory of subcategories(); track subcategory) {
                    <option [value]="subcategory">{{ subcategory }}</option>
                  }
                </select>
                @if (showError('subcategory')) {
                  <p class="t-error">{{ errorMessage('subcategory') }}</p>
                }
              </div>
              <div>
                <label class="t-label">Marca</label>
                <input
                  formControlName="brand"
                  class="t-input"
                />
                @if (showError('brand')) {
                  <p class="t-error">{{ errorMessage('brand') }}</p>
                }
              </div>
              <div>
                <label class="t-label">Talle</label>
                <input
                  formControlName="size"
                  class="t-input"
                />
                @if (showError('size')) {
                  <p class="t-error">{{ errorMessage('size') }}</p>
                }
              </div>
              <div>
                <label class="t-label">Color</label>
                <input
                  formControlName="color"
                  class="t-input"
                />
                @if (showError('color')) {
                  <p class="t-error">{{ errorMessage('color') }}</p>
                }
              </div>
              <div>
                <label class="t-label">Temporada</label>
                <select
                  formControlName="season"
                  class="t-input"
                >
                  <option value="">Elegí una temporada</option>
                  @for (season of seasons; track season) {
                    <option [value]="season">{{ season }}</option>
                  }
                </select>
                @if (showError('season')) {
                  <p class="t-error">{{ errorMessage('season') }}</p>
                }
              </div>
              <div class="sm:col-span-2">
                <span class="t-label">Condición</span>
                <div class="flex flex-wrap gap-3">
                  @for (condition of conditions; track condition.value) {
                    <label class="flex items-center gap-2 text-sm text-trama-body">
                      <input type="radio" formControlName="condition" [value]="condition.value" />
                      {{ condition.label }}
                    </label>
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
                <textarea
                  formControlName="description"
                  rows="3"
                  class="t-input"
                ></textarea>
              </div>
            </form>
          }
          @case (4) {
            <form [formGroup]="form" class="space-y-4">
              <div>
                <label class="t-label"
                  >¿Cuánto querés recibir?</label
                >
                <input
                  type="number"
                  formControlName="consignorPrice"
                  min="1"
                  class="t-input"
                />
                @if (showError('consignorPrice')) {
                  <p class="t-error">Ingresá un monto mayor a cero.</p>
                }
              </div>
              @if (salePrice() !== null) {
                <div class="rounded-xl bg-trama-sand-50 p-4 text-sm text-trama-body">
                  El comercio lo venderá a
                  <span class="font-semibold text-trama-brand">{{ salePrice() | money }}</span>
                </div>
              }
            </form>
          }
        }
      </div>

      @if (showErrors() && !canAdvance()) {
        <p class="rounded-lg bg-status-none-soft px-3 py-2 text-sm text-status-none" role="alert">
          Revisá los campos marcados antes de continuar.
        </p>
      }
      @if (submitError()) {
        <p class="rounded-lg bg-status-none-soft px-3 py-2 text-sm text-status-none" role="alert">
          {{ submitError() }}
        </p>
      }

      <div class="flex items-center justify-between">
        <button
          type="button"
          (click)="back()"
          [disabled]="step() === 1"
          class="rounded-lg px-4 py-2 text-sm font-medium text-trama-body disabled:opacity-40"
        >
          Anterior
        </button>
        @if (step() < 4) {
          <button
            type="button"
            (click)="next()"
            class="t-btn t-btn-primary"
          >
            Siguiente
          </button>
        } @else {
          <button
            type="button"
            (click)="submit()"
            [disabled]="submitting()"
            class="t-btn t-btn-primary"
          >
            {{ submitting() ? 'Enviando…' : 'Enviar propuesta' }}
          </button>
        }
      </div>
      }
    </div>
  `,
})
export class UploadGarment {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly garmentsService = inject(GarmentsService);
  private readonly proposalsService = inject(ProposalsService);
  private readonly merchantsService = inject(MerchantsService);
  private readonly consignorsService = inject(ConsignorsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly steps = STEPS;
  // Catálogo del comercio elegido (base − ocultas + propias), traído de la API.
  protected readonly categories = signal<Category[]>([]);
  protected readonly seasons = SEASONS;
  protected readonly conditions = CONDITIONS;

  protected readonly step = signal(1);
  protected readonly photos = signal<string[]>([]);
  protected readonly videoName = signal<string | null>(null);
  protected readonly selection = signal<Selection | null>(null);
  protected readonly search = signal('');
  protected readonly submitting = signal(false);
  protected readonly showErrors = signal(false);
  protected readonly submitError = signal('');
  // Pantalla de confirmación tras enviar la propuesta.
  protected readonly submitted = signal(false);
  protected readonly sentGarmentId = signal<string | null>(null);
  protected readonly sentMerchantName = signal('');

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

  private readonly merchants = toSignal(this.merchantsService.list(), { initialValue: [] });
  private readonly consignor = toSignal(
    this.consignorsService
      .getById(this.auth.user()?.id ?? '')
      .pipe(catchError(() => of(undefined))),
    { initialValue: undefined },
  );

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

  protected readonly merchantOptions = computed<MerchantOption[]>(() => {
    const origin = this.consignor()?.location;
    const term = this.search().trim().toLowerCase();
    return this.merchants()
      .map((merchant): MerchantOption => {
        const nearest = [...merchant.salesPoints].sort(
          (a, b) => this.distanceFrom(origin, a.geo) - this.distanceFrom(origin, b.geo),
        )[0];
        const distance =
          origin?.lat != null && origin.lng != null && nearest
            ? distanceKm({ lat: origin.lat, lng: origin.lng }, nearest.geo)
            : null;
        return {
          merchantId: merchant.id,
          salesPointId: nearest?.id ?? '',
          businessName: merchant.businessName,
          neighborhood: merchant.location.neighborhood,
          commission: merchant.commissionConfig.consignorPercentage,
          distance,
          scheduleDays: nearest?.receptionSchedule.days ?? '',
          scheduleHours: nearest?.receptionSchedule.hours ?? '',
        };
      })
      .filter(
        (option) =>
          !term ||
          option.businessName.toLowerCase().includes(term) ||
          option.neighborhood.toLowerCase().includes(term),
      )
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  });

  private readonly selectedMerchant = computed(() =>
    this.merchants().find((merchant) => merchant.id === this.selection()?.merchantId),
  );

  protected readonly salePrice = computed(() => {
    const price = Number(this.priceValue());
    const merchant = this.selectedMerchant();
    if (!price || !merchant) return null;
    return calculateSalePrice(price, merchant.commissionConfig.consignorPercentage);
  });

  constructor() {
    this.form.controls.category.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.subcategory.setValue(''));
  }

  protected circleClass(index: number): string {
    const current = this.step();
    if (index < current) return 'bg-trama-brand text-white';
    if (index === current) return 'bg-trama-brand text-white ring-4 ring-trama-green-100';
    return 'bg-trama-sand-200 text-trama-muted';
  }

  protected labelClass(index: number): string {
    return index <= this.step() ? 'font-medium text-trama-dark' : 'text-trama-muted';
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(input.files);
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) this.addFiles(event.dataTransfer.files);
  }

  protected removePhoto(index: number): void {
    this.photos.update((list) => list.filter((_, i) => i !== index));
  }

  protected onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.videoName.set(file.name);
    input.value = '';
  }

  protected removeVideo(): void {
    this.videoName.set(null);
  }

  private addFiles(files: FileList): void {
    Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .forEach((file) => {
        compressImage(file)
          .then((photo) => this.photos.update((list) => [...list, photo]))
          .catch(() => this.toast.show('No pudimos procesar una de las fotos', 'error'));
      });
  }

  protected select(option: MerchantOption): void {
    const current = this.selection();
    this.selection.set({ merchantId: option.merchantId, salesPointId: option.salesPointId });
    // El catálogo depende del comercio: al cambiarlo, recargo categorías y limpio
    // la selección previa de categoría/subcategoría que podría no existir en el nuevo.
    if (current?.merchantId !== option.merchantId) {
      this.form.controls.category.setValue('');
      this.form.controls.subcategory.setValue('');
      this.loadCategories(option.merchantId);
    }
  }

  private loadCategories(merchantId: string): void {
    this.categoriesService
      .forMerchant(merchantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => this.toast.show('No pudimos cargar las categorías del comercio', 'error'),
      });
  }

  protected canAdvance(): boolean {
    switch (this.step()) {
      case 1:
        return this.photos().length >= 1;
      case 2:
        return this.selection() !== null;
      case 3:
        return this.descriptionValid();
      case 4:
        return this.form.controls.consignorPrice.valid;
      default:
        return false;
    }
  }

  // Muestra el error de un campo del paso de descripción cuando fue tocado o
  // cuando el usuario ya intentó avanzar.
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

  protected next(): void {
    if (!this.canAdvance()) {
      this.revealErrors();
      return;
    }
    this.showErrors.set(false);
    if (this.step() < 4) this.step.update((value) => value + 1);
  }

  protected back(): void {
    this.showErrors.set(false);
    this.submitError.set('');
    if (this.step() > 1) this.step.update((value) => value - 1);
  }

  private revealErrors(): void {
    if (this.step() === 3) this.form.markAllAsTouched();
    this.showErrors.set(true);
  }

  protected submit(): void {
    if (this.submitting()) return;
    const selection = this.selection();
    const merchant = this.selectedMerchant();
    if (!selection || !merchant || !this.canAdvance()) {
      this.revealErrors();
      return;
    }
    this.submitError.set('');

    const raw = this.form.getRawValue();
    const consignorPrice = Number(raw.consignorPrice);
    const salePrice = calculateSalePrice(
      consignorPrice,
      merchant.commissionConfig.consignorPercentage,
    );

    this.submitting.set(true);
    this.garmentsService
      .create({
        consignorId: this.auth.user()?.id ?? '',
        merchantId: selection.merchantId,
        salesPointId: selection.salesPointId,
        name: raw.name ?? '',
        category: raw.category ?? '',
        subcategory: raw.subcategory ?? '',
        brand: raw.brand ?? '',
        size: raw.size ?? '',
        color: raw.color ?? '',
        season: raw.season ?? '',
        condition: raw.condition as GarmentCondition,
        description: raw.description ?? '',
        photos: this.photos(),
        video: this.videoName() ?? undefined,
      })
      .pipe(
        switchMap((garment) =>
          this.proposalsService
            .create({
              garmentId: garment.id,
              requestedConsignorPrice: consignorPrice,
              calculatedSalePrice: salePrice,
            })
            .pipe(map(() => garment)),
        ),
      )
      .subscribe({
        next: (garment) => {
          this.submitting.set(false);
          this.sentGarmentId.set(garment.id);
          this.sentMerchantName.set(merchant.businessName);
          this.submitted.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          const message = this.submitErrorMessage(err);
          this.submitError.set(message);
          this.toast.show(message, 'error');
        },
      });
  }

  protected reset(): void {
    this.form.reset({ consignorPrice: null });
    this.photos.set([]);
    this.videoName.set(null);
    this.selection.set(null);
    this.categories.set([]);
    this.search.set('');
    this.showErrors.set(false);
    this.submitError.set('');
    this.sentGarmentId.set(null);
    this.submitted.set(false);
    this.step.set(1);
  }

  protected viewGarment(): void {
    const id = this.sentGarmentId();
    if (id) this.router.navigate(['/c/garment', id]);
  }

  protected goHome(): void {
    this.router.navigate(['/c']);
  }

  private submitErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No pudimos conectarnos con el servidor. Probá de nuevo en unos minutos.';
    }
    if (err.status === 413) {
      return 'Las fotos son demasiado pesadas. Probá con menos fotos o imágenes más livianas.';
    }
    const detail = err.error?.message;
    const message = Array.isArray(detail) ? detail[0] : detail;
    return typeof message === 'string' && message
      ? message
      : 'No pudimos enviar la propuesta. Revisá los datos e intentá de nuevo.';
  }

  private descriptionValid(): boolean {
    return (
      ['name', 'category', 'subcategory', 'brand', 'size', 'color', 'season', 'condition'] as const
    ).every((control) => this.form.controls[control].valid);
  }

  private distanceFrom(
    origin: { lat?: number; lng?: number } | undefined,
    to: { lat: number; lng: number },
  ): number {
    if (origin?.lat == null || origin.lng == null) return Infinity;
    return distanceKm({ lat: origin.lat, lng: origin.lng }, to);
  }
}
