import { Component, computed, inject, signal } from '@angular/core';
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
import { ToastService } from '../../../shared/components/toast/toast.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { calculateSalePrice } from '../../../core/utils/price.util';
import { distanceKm } from '../../../core/utils/geo.util';
import { CATEGORIES, SEASONS } from '../../../core/models/garment-taxonomy';

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

const STEPS = ['Fotos', 'Descripción', 'Comercio', 'Precio'];

@Component({
  selector: 'app-upload-garment',
  imports: [ReactiveFormsModule, DecimalPipe, MoneyPipe],
  template: `
    <div class="mx-auto max-w-2xl space-y-6">
      <h1 class="text-2xl font-semibold text-trama-dark">Cargar artículo</h1>

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

      <div class="rounded-2xl border border-trama-sand-200 bg-white p-6">
        @switch (step()) {
          @case (1) {
            <div class="space-y-4">
              <p class="text-sm text-trama-dark/70">Subí al menos 3 fotos de tu prenda.</p>
              <label
                (dragover)="$event.preventDefault()"
                (drop)="onDrop($event)"
                class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-trama-sand-200 py-10 text-center text-trama-dark/60 hover:border-trama-brand"
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
                <p class="text-xs text-trama-dark/50">{{ photos().length }} foto(s) cargada(s).</p>
              }

              <div>
                <span class="mb-1 block text-sm font-medium text-trama-dark">Video (opcional)</span>
                @if (videoName(); as name) {
                  <div
                    class="flex items-center justify-between rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                  >
                    <span class="truncate text-trama-dark/80">{{ name }}</span>
                    <button
                      type="button"
                      (click)="removeVideo()"
                      class="ml-2 shrink-0 text-xs text-trama-dark/50 hover:text-status-none"
                    >
                      Quitar
                    </button>
                  </div>
                } @else {
                  <label
                    class="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-trama-sand-200 px-3 py-3 text-sm text-trama-dark/60 hover:border-trama-brand"
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
            <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="mb-1 block text-sm font-medium text-trama-dark">Nombre</label>
                <input
                  formControlName="name"
                  placeholder="Ej: Campera de jean azul"
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
                  @for (category of categories; track category.label) {
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
                <label class="mb-1 block text-sm font-medium text-trama-dark">Descripción</label>
                <textarea
                  formControlName="description"
                  rows="3"
                  class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
                ></textarea>
              </div>
            </form>
          }
          @case (3) {
            <div class="space-y-4">
              <input
                type="search"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
                placeholder="Buscar por nombre o barrio"
                class="w-full rounded-lg border border-trama-sand-200 px-3 py-2 text-sm"
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
                          <span class="text-xs text-trama-dark/60"
                            >{{ option.distance | number: '1.1-1' }} km</span
                          >
                        }
                      </div>
                      <span class="text-sm text-trama-dark/70">{{ option.neighborhood }}</span>
                      <span class="text-xs text-trama-dark/60"
                        >Comisión cedente: {{ option.commission }}% · Recepción:
                        {{ option.scheduleDays }} {{ option.scheduleHours }}</span
                      >
                    </button>
                  }
                </div>
              } @else {
                <p class="py-8 text-center text-sm text-trama-dark/60">
                  No encontramos comercios para tu búsqueda.
                </p>
              }
            </div>
          }
          @case (4) {
            <form [formGroup]="form" class="space-y-4">
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
            </form>
          }
        }
      </div>

      <div class="flex items-center justify-between">
        <button
          type="button"
          (click)="back()"
          [disabled]="step() === 1"
          class="rounded-lg px-4 py-2 text-sm font-medium text-trama-dark/70 disabled:opacity-40"
        >
          Anterior
        </button>
        @if (step() < 4) {
          <button
            type="button"
            (click)="next()"
            [disabled]="!canAdvance()"
            class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700 disabled:opacity-40"
          >
            Siguiente
          </button>
        } @else {
          <button
            type="button"
            (click)="submit()"
            [disabled]="!canAdvance() || submitting()"
            class="rounded-lg bg-trama-brand px-4 py-2 text-sm font-medium text-white hover:bg-trama-green-700 disabled:opacity-40"
          >
            {{ submitting() ? 'Enviando…' : 'Enviar propuesta' }}
          </button>
        }
      </div>
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
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly steps = STEPS;
  protected readonly categories = CATEGORIES;
  protected readonly seasons = SEASONS;
  protected readonly conditions = CONDITIONS;

  protected readonly step = signal(1);
  protected readonly photos = signal<string[]>([]);
  protected readonly videoName = signal<string | null>(null);
  protected readonly selection = signal<Selection | null>(null);
  protected readonly search = signal('');
  protected readonly submitting = signal(false);

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
    () => CATEGORIES.find((category) => category.label === this.categoryValue())?.subcategories ?? [],
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
    return 'bg-trama-sand-200 text-trama-dark/50';
  }

  protected labelClass(index: number): string {
    return index <= this.step() ? 'font-medium text-trama-dark' : 'text-trama-dark/40';
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
        const reader = new FileReader();
        reader.onload = () => this.photos.update((list) => [...list, reader.result as string]);
        reader.readAsDataURL(file);
      });
  }

  protected select(option: MerchantOption): void {
    this.selection.set({ merchantId: option.merchantId, salesPointId: option.salesPointId });
  }

  protected canAdvance(): boolean {
    switch (this.step()) {
      case 1:
        return this.photos().length >= 3;
      case 2:
        return this.step2Valid();
      case 3:
        return this.selection() !== null;
      case 4:
        return this.form.controls.consignorPrice.valid;
      default:
        return false;
    }
  }

  protected next(): void {
    if (this.canAdvance() && this.step() < 4) this.step.update((value) => value + 1);
  }

  protected back(): void {
    if (this.step() > 1) this.step.update((value) => value - 1);
  }

  protected submit(): void {
    const selection = this.selection();
    const merchant = this.selectedMerchant();
    if (!selection || !merchant || !this.canAdvance() || this.submitting()) return;

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
          this.toast.show('Propuesta enviada', 'success');
          this.router.navigate(['/c/garment', garment.id]);
        },
        error: () => {
          this.submitting.set(false);
          this.toast.show('No pudimos enviar la propuesta', 'error');
        },
      });
  }

  private step2Valid(): boolean {
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
