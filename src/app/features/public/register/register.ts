import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { PlatformConfigService } from '../../../core/services/platform-config.service';
import { Role } from '../../../core/models/user.model';
import {
  RegisterConsignorRequest,
  RegisterMerchantRequest,
} from '../../../core/models/register.model';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { LogoIcon } from '../../../shared/components/logo/logo';
import { Coords, MapPickerDirective } from '../../../shared/directives/map-picker.directive';
import { toSignal } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { Mail, Shirt, Store } from 'lucide-angular';
import { WizardShell, WizardStep, WizardSummaryRow } from '../../../shared/components/wizard-shell/wizard-shell';
import { Dropdown, DropdownOption } from '../../../shared/components/dropdown/dropdown';
import { BlobIcon } from '../../../shared/components/blob-icon/blob-icon';
import { Stitch } from '../../../shared/components/stitch/stitch';
import { StackedBar, StackSegment } from '../../../shared/components/charts/charts';
import { ResultScreen } from '../../../shared/components/result-screen/result-screen';
import { VerifiedChip } from '../../../shared/components/verified-badge/verified-badge';
import { EnterDirective } from '../../../shared/directives/enter.directive';

interface StepDef {
  id: string;
  label: string;
  title: string;
  sub: string;
}

// Fallback geolocation when the user never drags the pin: the city centre, so the request is valid.
const CORDOBA_CENTER = { lat: -31.4201, lng: -64.1888 };

const DAYS = [
  { label: 'Lunes', short: 'Lun' },
  { label: 'Martes', short: 'Mar' },
  { label: 'Miércoles', short: 'Mié' },
  { label: 'Jueves', short: 'Jue' },
  { label: 'Viernes', short: 'Vie' },
  { label: 'Sábado', short: 'Sáb' },
  { label: 'Domingo', short: 'Dom' },
];

const TIME_SLOTS = ((): string[] => {
  const out: string[] = [];
  for (let m = 7 * 60; m <= 22 * 60; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
})();

const CONSIGNOR_STEPS: StepDef[] = [
  {
    id: 'account',
    label: 'Datos de la cuenta',
    title: 'Tus datos de contacto',
    sub: 'Con estos datos el comercio te identifica y te avisamos de cada movimiento de tus prendas.',
  },
  {
    id: 'dni',
    label: 'Identidad',
    title: 'Verificación de identidad',
    sub: 'El DNI queda asociado a la cuenta para respaldar la entrega de prendas y el cobro de liquidaciones.',
  },
  {
    id: 'location',
    label: 'Ubicación',
    title: '¿Desde dónde consignás?',
    sub: 'Usamos la zona para mostrarte los comercios más cercanos. No publicamos tu dirección exacta.',
  },
  {
    id: 'terms',
    label: 'Términos',
    title: 'Revisá y confirmá',
    sub: 'Última revisión antes de crear la cuenta.',
  },
];

const MERCHANT_STEPS: StepDef[] = [
  {
    id: 'account',
    label: 'Datos de la cuenta',
    title: 'Datos de quien administra',
    sub: 'La persona responsable de la cuenta: recibe los avisos y firma los acuerdos con los cedentes.',
  },
  {
    id: 'business',
    label: 'El comercio',
    title: 'Datos del comercio',
    sub: 'Así aparece tu comercio ante los cedentes cuando eligen dónde consignar.',
  },
  {
    id: 'pdv',
    label: 'Punto de venta',
    title: 'Primer punto de venta',
    sub: 'Dónde recibís las prendas y en qué horarios. Después podés agregar más puntos.',
  },
  {
    id: 'commission',
    label: 'Comisión',
    title: 'Cómo se reparte cada venta',
    sub: 'El porcentaje se aplica sobre el precio de venta al público de cada prenda.',
  },
  {
    id: 'conditions',
    label: 'Condiciones',
    title: 'Plazos y día de pago',
    sub: 'Las condiciones que acepta el cedente cuando consigna con vos.',
  },
  {
    id: 'terms',
    label: 'Términos',
    title: 'Revisá y confirmá',
    sub: 'Última revisión antes de crear la cuenta.',
  },
];

function daysLabel(selected: boolean[]): string {
  const idx = selected.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return '';
  const groups: number[][] = [];
  idx.forEach((i) => {
    const last = groups[groups.length - 1];
    if (last && i === last[last.length - 1] + 1) last.push(i);
    else groups.push([i]);
  });
  return groups
    .map((g) =>
      g.length >= 3
        ? `${DAYS[g[0]].label} a ${DAYS[g[g.length - 1]].label.toLowerCase()}`
        : g.map((i) => DAYS[i].short).join(', '),
    )
    .join(' y ');
}

interface SummaryRow {
  key: string;
  value: string;
}

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LogoIcon,
    MapPickerDirective,
    WizardShell,
    Dropdown,
    BlobIcon,
    Stitch,
    StackedBar,
    ResultScreen,
    VerifiedChip,
    EnterDirective,
  ],
  styles: `
    .day {
      border: 2px dashed var(--color-trama-thread-faint);
      color: var(--color-trama-body);
      transition: all 150ms;
    }
    .day:hover {
      border-color: var(--color-trama-dark);
      color: var(--color-trama-dark);
    }
    .day-on,
    .day-on:hover {
      border: 2px solid var(--color-trama-dark);
      background: var(--color-trama-dark);
      color: var(--color-trama-sand-50);
    }
    .hours ::ng-deep button {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 17px;
    }
    .hours-baste {
      background-image: linear-gradient(to right, #c9c2ae 7px, transparent 7px);
      background-size: 12px 3px;
      background-repeat: repeat-x;
    }
    .payday {
      font-weight: 600;
      color: var(--color-trama-body);
      transition: background-color 150ms;
    }
    .payday:hover {
      background: var(--color-trama-sand-50);
    }
    .payday-on,
    .payday-on:hover {
      background: var(--color-trama-gold);
      color: var(--color-trama-dark);
      font-weight: 800;
    }
    .pct-range {
      accent-color: var(--color-trama-dark);
    }
  `,
  template: `
    <div class="min-h-screen bg-trama-sand-50 px-4 pb-16 pt-6 sm:px-6">
      <div class="mx-auto max-w-[1080px]">
        <div class="mb-6 flex items-center justify-between gap-3">
          <a routerLink="/" class="flex items-center gap-2.5">
            <app-logo-icon [size]="34" [decorative]="true" />
            <span class="font-display text-[22px] font-bold tracking-[-0.02em] text-trama-dark">Trama</span>
          </a>
          <span class="text-sm text-trama-body">
            ¿Ya tenés cuenta?
            <a routerLink="/login" class="t-link ml-1 text-trama-dark">Ingresar</a>
          </span>
        </div>

        @switch (view()) {
          @case ('role') {
            <div class="mx-auto max-w-[880px]">
              <p class="text-eyebrow" appEnter>Registro</p>
              <h1 class="text-title-1 mt-2 text-trama-dark" [appEnter]="1">¿Cómo vas a usar Trama?</h1>
              <app-stitch class="mt-3" variant="knot" [width]="180" [animate]="true" [delay]="300" />
              <p class="text-lead mt-3 text-trama-body" [appEnter]="2">Elegí un rol para empezar. Después podés sumar todo lo demás.</p>

              <div class="mt-8 grid gap-4 sm:grid-cols-2">
                <div class="t-card t-lift flex flex-col gap-3 p-7" [appEnter]="3">
                  <app-blob-icon [icon]="shirtIcon" [size]="64" [iconSize]="30" tone="gold" [rotate]="-12" />
                  <span class="text-eyebrow mt-2">Cedente</span>
                  <h2 class="text-title-2 text-trama-dark">Quiero dejar prendas en consignación</h2>
                  <p class="text-[15px] text-trama-body">Cargás tus prendas, acordás el precio con el comercio y cobrás cuando se venden.</p>
                  <ul class="mt-1 space-y-1.5 text-sm text-trama-body">
                    <li class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-trama-knot"></span>Datos personales y DNI</li>
                    <li class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-trama-knot"></span>Barrio y ciudad</li>
                    <li class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-trama-knot"></span>Verificación del email</li>
                  </ul>
                  <button type="button" (click)="pick('consignor')" class="t-btn t-btn-primary mt-auto">Registrarme como cedente</button>
                </div>

                <div class="t-card t-lift flex flex-col gap-3 p-7" [appEnter]="4">
                  <app-blob-icon [icon]="storeIcon" [size]="64" [iconSize]="30" tone="sage" [rotate]="14" />
                  <span class="text-eyebrow mt-2">Comercio</span>
                  <h2 class="text-title-2 text-trama-dark">Quiero recibir prendas para vender</h2>
                  <p class="text-[15px] text-trama-body">Configurás tu comisión, tus condiciones de venta y el punto de venta donde recibís.</p>
                  @if (monetization()) {
                    <p class="rounded-xl bg-trama-green-50 px-3 py-2 text-[13px] font-semibold text-trama-green-700">
                      Servicio pago para comercios: tu suscripción te posiciona ante los cedentes que buscan dónde consignar.
                    </p>
                  }
                  <ul class="mt-1 space-y-1.5 text-sm text-trama-body">
                    <li class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-trama-knot"></span>Datos del comercio y CUIT</li>
                    <li class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-trama-knot"></span>Punto de venta y horarios</li>
                    <li class="flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-trama-knot"></span>Comisión, plazos y día de pago</li>
                  </ul>
                  <button type="button" (click)="pick('merchant')" class="t-btn t-btn-secondary mt-auto">Registrarme como comercio</button>
                </div>
              </div>
            </div>
          }

          @case ('wizard') {
            @if (step() === 0) {
              <button type="button" (click)="back()" class="t-btn t-btn-ghost t-btn-sm mb-3 !px-2">← Cambiar de rol</button>
            }
            @if (role() === 'merchant' && monetization()) {
              <div class="mx-auto mb-4 max-w-[1080px] rounded-2xl bg-trama-green-50 px-5 py-4">
                <p class="text-sm font-bold text-trama-dark">Trama es un servicio pago para comercios</p>
                <p class="mt-1 text-sm text-trama-body">
                  Con tu suscripción aparecés ante los cedentes de tu zona que buscan dónde consignar, además de
                  todas las herramientas para gestionar el ciclo. Cuanto mejor tu plan, mejor tu posicionamiento en la plataforma.
                </p>
              </div>
            }

            <app-wizard-shell
              [eyebrow]="role() === 'merchant' ? 'Registro · comercio' : 'Registro · cedente'"
              [steps]="wizardSteps()"
              [current]="step()"
              [summary]="sideSummary()"
              summaryTitle="Tu cuenta"
              finishLabel="Crear cuenta"
              busyLabel="Creando cuenta…"
              [busy]="submitting()"
              (next)="step() < steps().length - 1 ? next() : submit()"
              (back)="back()"
              (stepChange)="goToStep($event)"
            >
              @if (submitError()) {
                <div class="t-alert mb-5" role="alert">{{ submitError() }}</div>
              } @else if (showErrors() && !canAdvance()) {
                <div class="t-alert mb-5" role="alert">Revisá los campos marcados antes de seguir.</div>
              }

              @switch (current().id) {
                @case ('account') {
                  <form [formGroup]="accountForm" class="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    @if (role() === 'merchant') {
                      <div class="sm:col-span-2">
                        <label class="t-label" for="r-name">Nombre y apellido</label>
                        <input id="r-name" formControlName="name" placeholder="María Vega" class="t-input" [class.t-input-error]="showErrors() && !accountForm.controls.name.value?.trim()" />
                        @if (showErrors() && !accountForm.controls.name.value?.trim()) {
                          <p class="t-error">Ingresá el nombre y apellido.</p>
                        }
                      </div>
                    } @else {
                      <div>
                        <label class="t-label" for="r-first">Nombre</label>
                        <input id="r-first" formControlName="firstName" placeholder="María" class="t-input" [class.t-input-error]="showErrors() && !accountForm.controls.firstName.value?.trim()" />
                        @if (showErrors() && !accountForm.controls.firstName.value?.trim()) {
                          <p class="t-error">Ingresá tu nombre.</p>
                        }
                      </div>
                      <div>
                        <label class="t-label" for="r-last">Apellido</label>
                        <input id="r-last" formControlName="lastName" placeholder="Vega" class="t-input" [class.t-input-error]="showErrors() && !accountForm.controls.lastName.value?.trim()" />
                        @if (showErrors() && !accountForm.controls.lastName.value?.trim()) {
                          <p class="t-error">Ingresá tu apellido.</p>
                        }
                      </div>
                    }
                    <div>
                      <label class="t-label" for="r-email">Email</label>
                      <input id="r-email" formControlName="email" type="email" placeholder="maria@email.com" class="t-input" autocomplete="email" />
                      @if (showError(accountForm, 'email')) {
                        <p class="t-error">{{ errorMessage(accountForm, 'email') }}</p>
                      }
                    </div>
                    <div>
                      <label class="t-label" for="r-phone">Teléfono</label>
                      <input id="r-phone" formControlName="phone" type="tel" placeholder="+54 9 351 555 1234" class="t-input" autocomplete="tel" />
                      @if (showError(accountForm, 'phone')) {
                        <p class="t-error">{{ errorMessage(accountForm, 'phone') }}</p>
                      }
                    </div>
                    <div>
                      <label class="t-label" for="r-pass">Contraseña</label>
                      <input id="r-pass" formControlName="password" type="password" placeholder="Mínimo 8 caracteres" class="t-input" autocomplete="new-password" />
                      @if (showError(accountForm, 'password')) {
                        <p class="t-error">{{ errorMessage(accountForm, 'password') }}</p>
                      }
                    </div>
                    <div>
                      <label class="t-label" for="r-pass2">Repetir contraseña</label>
                      <input id="r-pass2" formControlName="password2" type="password" class="t-input" autocomplete="new-password" [class.t-input-error]="passwordMismatch()" />
                      @if (passwordMismatch()) {
                        <p class="t-error">Las contraseñas no coinciden.</p>
                      }
                    </div>
                  </form>
                }
                @case ('dni') {
                  <form [formGroup]="dniForm" class="max-w-sm space-y-4">
                    <div>
                      <label class="t-label" for="r-dni">Número de DNI</label>
                      <input id="r-dni" formControlName="dni" inputmode="numeric" placeholder="30123456" class="t-input" />
                      @if (showError(dniForm, 'dni')) {
                        <p class="t-error">{{ errorMessage(dniForm, 'dni') }}</p>
                      } @else {
                        <p class="t-help">Sin puntos ni espacios.</p>
                      }
                    </div>
                    <div>
                      <label class="t-label" for="r-bank">CBU / CVU / Alias</label>
                      <input id="r-bank" formControlName="bankDetails" placeholder="alias.de.cobro o CBU" class="t-input" />
                      @if (showError(dniForm, 'bankDetails')) {
                        <p class="t-error">{{ errorMessage(dniForm, 'bankDetails') }}</p>
                      } @else {
                        <p class="t-help">Donde vas a recibir el pago de tus liquidaciones.</p>
                      }
                    </div>
                  </form>
                }
                @case ('location') {
                  <form [formGroup]="consignorLocationForm" class="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <div>
                      <label class="t-label" for="r-street">Calle</label>
                      <input id="r-street" formControlName="street" placeholder="Independencia" class="t-input" />
                      @if (showError(consignorLocationForm, 'street')) {
                        <p class="t-error">{{ errorMessage(consignorLocationForm, 'street') }}</p>
                      }
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="t-label" for="r-num">Número</label>
                        <input id="r-num" formControlName="number" placeholder="742" class="t-input" />
                        @if (showError(consignorLocationForm, 'number')) {
                          <p class="t-error">{{ errorMessage(consignorLocationForm, 'number') }}</p>
                        }
                      </div>
                      <div>
                        <label class="t-label" for="r-unit">Depto / Piso <span class="font-medium text-trama-muted">(opcional)</span></label>
                        <input id="r-unit" formControlName="unit" placeholder="3B" class="t-input" />
                      </div>
                    </div>
                    <div>
                      <label class="t-label" for="r-hood">Barrio</label>
                      <input id="r-hood" formControlName="neighborhood" placeholder="Nueva Córdoba" class="t-input" />
                      @if (showError(consignorLocationForm, 'neighborhood')) {
                        <p class="t-error">{{ errorMessage(consignorLocationForm, 'neighborhood') }}</p>
                      }
                    </div>
                    <div>
                      <label class="t-label" for="r-city">Ciudad</label>
                      <input id="r-city" formControlName="city" placeholder="Córdoba" class="t-input" />
                      @if (showError(consignorLocationForm, 'city')) {
                        <p class="t-error">{{ errorMessage(consignorLocationForm, 'city') }}</p>
                      }
                    </div>
                    <div class="sm:col-span-2">
                      <span class="t-label">Marcá tu ubicación en el mapa</span>
                      <div appMapPicker (coordsChange)="consignorGeo.set($event)" class="h-60 w-full overflow-hidden rounded-2xl"></div>
                      <p class="t-help">Arrastrá el punto o tocá el mapa para ajustarlo. No publicamos tu dirección exacta.</p>
                    </div>
                  </form>
                }
                @case ('business') {
                  <form [formGroup]="businessForm" class="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <div>
                      <label class="t-label" for="r-biz">Nombre del comercio</label>
                      <input id="r-biz" formControlName="businessName" placeholder="Vuelta Showroom" class="t-input" />
                      @if (showError(businessForm, 'businessName')) {
                        <p class="t-error">{{ errorMessage(businessForm, 'businessName') }}</p>
                      }
                    </div>
                    <div>
                      <label class="t-label" for="r-cuit">CUIT</label>
                      <input id="r-cuit" formControlName="cuit" inputmode="numeric" placeholder="30712345678" class="t-input" />
                      @if (showError(businessForm, 'cuit')) {
                        <p class="t-error">{{ errorMessage(businessForm, 'cuit') }}</p>
                      } @else {
                        <p class="t-help">11 dígitos, sin guiones.</p>
                      }
                    </div>
                    <div>
                      <label class="t-label" for="r-bhood">Barrio</label>
                      <input id="r-bhood" formControlName="neighborhood" placeholder="Güemes" class="t-input" />
                      @if (showError(businessForm, 'neighborhood')) {
                        <p class="t-error">{{ errorMessage(businessForm, 'neighborhood') }}</p>
                      }
                    </div>
                    <div>
                      <label class="t-label" for="r-bcity">Ciudad</label>
                      <input id="r-bcity" formControlName="city" placeholder="Córdoba" class="t-input" />
                      @if (showError(businessForm, 'city')) {
                        <p class="t-error">{{ errorMessage(businessForm, 'city') }}</p>
                      }
                    </div>
                  </form>
                }
                @case ('pdv') {
                  <form [formGroup]="pdvForm" class="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                    <div>
                      <label class="t-label" for="r-spname">Nombre del punto de venta</label>
                      <input id="r-spname" formControlName="spName" placeholder="Local Güemes" class="t-input" />
                      @if (showError(pdvForm, 'spName')) {
                        <p class="t-error">{{ errorMessage(pdvForm, 'spName') }}</p>
                      }
                    </div>
                    <div>
                      <label class="t-label" for="r-spphone">Teléfono del local</label>
                      <input id="r-spphone" formControlName="spPhone" type="tel" placeholder="351 444 2020" class="t-input" />
                      @if (showError(pdvForm, 'spPhone')) {
                        <p class="t-error">{{ errorMessage(pdvForm, 'spPhone') }}</p>
                      }
                    </div>
                    <div class="sm:col-span-2">
                      <label class="t-label" for="r-spaddr">Dirección</label>
                      <input id="r-spaddr" formControlName="spAddress" placeholder="Belgrano 800" class="t-input" />
                      @if (showError(pdvForm, 'spAddress')) {
                        <p class="t-error">{{ errorMessage(pdvForm, 'spAddress') }}</p>
                      }
                    </div>
                    <div class="sm:col-span-2">
                      <label class="t-label" for="r-spins">Instrucciones para el cedente <span class="font-medium text-trama-muted">(opcional)</span></label>
                      <textarea id="r-spins" formControlName="spInstructions" rows="2" placeholder="Traer las prendas planchadas y en bolsa. Preguntar por Ana en el mostrador." class="t-input"></textarea>
                    </div>
                    <div class="sm:col-span-2">
                      <span class="t-label">Días de atención</span>
                      <div class="grid max-w-[420px] grid-cols-7 gap-1.5" role="group" aria-label="Días de atención">
                        @for (day of days; track day.short; let i = $index) {
                          <button
                            type="button"
                            class="day h-11 rounded-[11px] text-sm font-bold"
                            [class.day-on]="daysSel()[i]"
                            [attr.aria-pressed]="daysSel()[i]"
                            [attr.aria-label]="day.label"
                            (click)="toggleDay(i)"
                          >
                            {{ day.short }}
                          </button>
                        }
                      </div>
                      @if (showErrors() && !daysSel().includes(true)) {
                        <p class="t-error">Elegí al menos un día de atención.</p>
                      } @else if (daysText()) {
                        <p class="t-help">{{ daysText() }}</p>
                      }
                    </div>
                    <div class="sm:col-span-2">
                      <span class="t-label">Horario</span>
                      <div class="flex max-w-[420px] items-center gap-3">
                        <app-dropdown class="hours flex-1" ariaLabel="Abre" [options]="timeOptions" [value]="fromTime()" (valueChange)="setFrom($event)" />
                        <span class="hours-baste h-[3px] w-10 shrink-0" aria-hidden="true"></span>
                        <app-dropdown class="hours flex-1" ariaLabel="Cierra" [options]="timeOptions" [value]="toTime()" (valueChange)="setTo($event)" [invalid]="!hoursValid()" [alignRight]="true" />
                      </div>
                      @if (!hoursValid()) {
                        <p class="t-error">El cierre tiene que ser después de la apertura.</p>
                      }
                    </div>
                    <div class="sm:col-span-2">
                      <div class="mb-1.5 flex items-baseline justify-between gap-3">
                        <span class="t-label !mb-0">Ubicación exacta del local</span>
                        <span class="text-xs text-trama-muted">{{ coordsLabel(merchantGeo()) }}</span>
                      </div>
                      <div appMapPicker kind="merchant" (coordsChange)="merchantGeo.set($event)" class="h-60 w-full overflow-hidden rounded-2xl"></div>
                      <p class="t-help">Arrastrá el pin o tocá el mapa para ubicar la puerta del local.</p>
                    </div>
                  </form>
                }
                @case ('commission') {
                  <div class="max-w-[520px] space-y-5">
                    <div class="flex items-center justify-between gap-4 rounded-2xl bg-trama-sand-50 px-5 py-4">
                      <label class="text-[15px] font-semibold text-trama-dark" for="r-pct">Tu comisión</label>
                      <span class="flex items-baseline gap-1">
                        <input
                          id="r-pct"
                          type="number"
                          min="5"
                          max="60"
                          [value]="merchantPct()"
                          (input)="setMerchantPct($any($event.target).value)"
                          class="w-20 bg-transparent text-right font-display text-[28px] font-extrabold tabular-nums text-trama-dark outline-none"
                        />
                        <span class="font-display text-[28px] font-extrabold text-trama-dark">%</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="1"
                      class="pct-range w-full"
                      aria-label="Comisión del comercio"
                      [value]="merchantPct()"
                      (input)="setMerchantPct($any($event.target).value)"
                    />
                    <app-stacked-bar [segments]="commissionSegments()" [legend]="false" [thickness]="18" />
                    <div class="flex justify-between text-[13px] text-trama-body">
                      <span>Comercio {{ merchantPct() }} %</span>
                      <span>Cedente {{ consignorPct() }} %</span>
                    </div>
                    <div class="t-summary text-[15px]">
                      <p class="text-trama-body">Una prenda que se vende a <strong class="font-display text-trama-dark">$20.000</strong>:</p>
                      <div class="mt-2 flex justify-between"><span class="text-trama-body">El cedente recibe</span><span class="font-display font-bold tabular-nums text-trama-dark">{{ example(consignorPct()) }}</span></div>
                      <div class="mt-1 flex justify-between"><span class="text-trama-body">Tu ganancia</span><span class="font-display font-bold tabular-nums text-trama-dark">{{ example(merchantPct()) }}</span></div>
                    </div>
                    @if (!commissionValid()) {
                      <p class="t-error">El porcentaje del cedente tiene que estar entre 40 % y 95 %.</p>
                    }
                  </div>
                }
                @case ('conditions') {
                  <form [formGroup]="conditionsForm" class="space-y-6">
                    <div class="grid max-w-[520px] gap-4 sm:grid-cols-2">
                      <div>
                        <label class="t-label" for="r-window">Plazo de venta</label>
                        <div class="flex items-center gap-2">
                          <input id="r-window" formControlName="saleWindowMonths" type="number" min="1" max="12" class="t-input !w-24" />
                          <span class="text-sm text-trama-body">meses</span>
                        </div>
                        @if (showError(conditionsForm, 'saleWindowMonths')) {
                          <p class="t-error">{{ errorMessage(conditionsForm, 'saleWindowMonths') }}</p>
                        } @else {
                          <p class="t-help">Tiempo en exhibición (1 a 12).</p>
                        }
                      </div>
                      <div>
                        <label class="t-label" for="r-grace">Período de gracia</label>
                        <div class="flex items-center gap-2">
                          <input id="r-grace" formControlName="graceMonths" type="number" min="0" max="6" class="t-input !w-24" />
                          <span class="text-sm text-trama-body">meses</span>
                        </div>
                        @if (showError(conditionsForm, 'graceMonths')) {
                          <p class="t-error">{{ errorMessage(conditionsForm, 'graceMonths') }}</p>
                        } @else {
                          <p class="t-help">Meses extra (0 a 6).</p>
                        }
                      </div>
                    </div>
                    <div>
                      <span class="t-label">Día de pago</span>
                      <div class="grid max-w-[340px] grid-cols-7 gap-1" role="radiogroup" aria-label="Día de pago">
                        @for (d of payDays; track d) {
                          <button
                            type="button"
                            role="radio"
                            class="payday h-9 w-9 rounded-full text-sm tabular-nums"
                            [class.payday-on]="conditionsForm.controls.payoutDay.value === d"
                            [attr.aria-checked]="conditionsForm.controls.payoutDay.value === d"
                            (click)="conditionsForm.controls.payoutDay.setValue(d)"
                          >
                            {{ d }}
                          </button>
                        }
                      </div>
                      <p class="t-help">Pagás el {{ conditionsForm.controls.payoutDay.value }} de cada mes las prendas vendidas el mes anterior.</p>
                    </div>
                  </form>
                }
                @case ('terms') {
                  <div class="space-y-5">
                    <div class="t-summary grid gap-x-6 gap-y-3 !p-5 sm:grid-cols-2">
                      @for (row of summary(); track row.key) {
                        <div class="min-w-0">
                          <p class="text-[12px] font-bold uppercase tracking-[0.08em] text-trama-muted">{{ row.key }}</p>
                          <p class="mt-0.5 truncate text-[15px] text-trama-dark">{{ row.value }}</p>
                        </div>
                      }
                    </div>
                    <div class="max-h-44 space-y-2 overflow-auto rounded-2xl bg-trama-sand-50 p-5 text-sm leading-relaxed text-trama-body">
                      <p>La consignación no transfiere la propiedad de la prenda: el cedente sigue siendo dueño hasta que se concreta la venta al público.</p>
                      <p>El comercio recibe, revisa y exhibe las prendas acordadas, y registra cualquier discrepancia respecto de la propuesta al momento de la recepción.</p>
                      <p>El reparto de cada venta se rige por la comisión acordada. Un cambio posterior de comisión no afecta a las prendas ya acordadas.</p>
                      <p>Las liquidaciones se pagan el día del mes definido por el comercio, por las prendas vendidas en el período anterior.</p>
                    </div>
                    <label class="flex cursor-pointer items-start gap-3 text-[15px] text-trama-dark">
                      <input type="checkbox" class="t-check mt-0.5" [checked]="accepted()" (change)="accepted.set($any($event.target).checked)" />
                      <span>Leí y acepto los términos de consignación y la política de datos de Trama.</span>
                    </label>
                    @if (showErrors() && !accepted()) {
                      <p class="t-error">Tenés que aceptar los términos para crear la cuenta.</p>
                    }
                  </div>
                }
              }
            </app-wizard-shell>
          }

          @case ('verify') {
            <div class="t-card-raised mx-auto max-w-[560px] p-7 sm:p-10">
              <app-blob-icon [icon]="mailIcon" [size]="72" [iconSize]="32" tone="success" iconColor="#2E7D54" />
              <p class="text-eyebrow mt-5">Cuenta creada</p>
              <h1 class="text-title-2 mt-1.5 text-trama-dark">Confirmá tu email</h1>
              <p class="mt-2 text-[15px] text-trama-body">
                Te enviamos un código de 6 dígitos a
                <strong class="text-trama-dark">{{ accountForm.controls.email.value }}</strong>. Ingresalo para verificar tu cuenta.
              </p>

              <div class="mt-6 space-y-3">
                <input
                  [value]="code()"
                  (input)="setCode($any($event.target).value)"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="123456"
                  aria-label="Código de verificación"
                  class="t-input max-w-[260px] text-center font-display !text-[28px] font-extrabold tracking-[0.3em]"
                  [class.t-input-error]="!!codeError()"
                />
                @if (codeError()) {
                  <p class="t-error">{{ codeError() }}</p>
                }
                <div class="flex flex-wrap items-center gap-3 pt-1">
                  <button type="button" (click)="verify()" [disabled]="code().length < 6 || verifying()" class="t-btn t-btn-primary">
                    {{ verifying() ? 'Verificando…' : 'Verificar' }}
                  </button>
                  <button type="button" (click)="resend()" [disabled]="resending()" class="t-btn t-btn-ghost">
                    {{ resending() ? 'Enviando…' : 'Reenviar código' }}
                  </button>
                </div>
              </div>

              <button type="button" (click)="finish()" class="t-link mt-6 block">Verificar más tarde</button>
            </div>
          }

          @case ('done') {
            <div class="t-card-raised mx-auto max-w-[640px] px-6">
              <app-result-screen eyebrow="Cuenta creada" [title]="doneTitle()" [body]="doneSub()">
                @if (verified()) {
                  <div summary class="flex justify-center">
                    <app-verified-chip label="Email verificado" />
                  </div>
                }
                <a actions [routerLink]="panelHref()" class="t-btn t-btn-primary">{{ panelLabel() }}</a>
              </app-result-screen>
            </div>
          }
        }
        @if (view() !== 'done') {
          <p class="mt-8 text-center text-sm text-trama-body">
            <a routerLink="/ayuda" [queryParams]="helpParams()" class="t-link">¿Necesitás ayuda?</a>
          </p>
        }
      </div>
    </div>
  `,
})
export class Register {
  /** Link a la ayuda filtrada por el rol que se está registrando. */
  protected readonly helpParams = computed(() => {
    const r = this.role();
    return r === 'consignor' ? { rol: 'cedente' } : r === 'merchant' ? { rol: 'comercio' } : {};
  });

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly platformConfig = inject(PlatformConfigService);

  // Flag de cobro a comercios: comunica en el registro que el servicio es pago.
  protected readonly monetization = this.platformConfig.monetization;

  protected readonly days = DAYS;
  protected readonly timeSlots = TIME_SLOTS;
  protected readonly inputClass =
    't-input';

  protected readonly view = signal<'role' | 'wizard' | 'verify' | 'done'>('role');
  protected readonly role = signal<Role | null>(null);
  protected readonly step = signal(0);
  protected readonly submitting = signal(false);
  // Pasa a true cuando el usuario intenta avanzar con el paso incompleto, para
  // revelar los mensajes de validación de ese paso.
  protected readonly showErrors = signal(false);
  protected readonly submitError = signal('');

  protected readonly daysSel = signal<boolean[]>([true, true, true, true, true, false, false]);
  protected readonly fromTime = signal('10:00');
  protected readonly toTime = signal('18:00');
  protected readonly consignorPct = signal(70);
  protected readonly code = signal('');
  protected readonly accepted = signal(false);
  protected readonly verifying = signal(false);
  protected readonly resending = signal(false);
  protected readonly codeError = signal('');
  protected readonly verified = signal(false);
  protected readonly consignorGeo = signal<Coords>(CORDOBA_CENTER);
  protected readonly merchantGeo = signal<Coords>(CORDOBA_CENTER);

  protected readonly accountForm = this.fb.group({
    name: [''], // used by the merchant flow; consignor uses firstName/lastName
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password2: ['', Validators.required],
  });

  protected readonly dniForm = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    bankDetails: ['', [Validators.required, Validators.minLength(3)]],
  });

  protected readonly consignorLocationForm = this.fb.group({
    street: ['', Validators.required],
    number: ['', Validators.required],
    unit: [''],
    neighborhood: ['', Validators.required],
    city: ['', Validators.required],
  });

  protected readonly businessForm = this.fb.group({
    businessName: ['', Validators.required],
    cuit: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    neighborhood: ['', Validators.required],
    city: ['', Validators.required],
  });

  protected readonly pdvForm = this.fb.group({
    spName: ['', Validators.required],
    spPhone: ['', Validators.required],
    spAddress: ['', Validators.required],
    spInstructions: [''],
  });

  protected readonly conditionsForm = this.fb.group({
    saleWindowMonths: [3, [Validators.required, Validators.min(1), Validators.max(12)]],
    graceMonths: [1, [Validators.required, Validators.min(0), Validators.max(6)]],
    payoutDay: [10, [Validators.required, Validators.min(1), Validators.max(28)]],
  });

  protected readonly steps = computed<StepDef[]>(() =>
    this.role() === 'merchant' ? MERCHANT_STEPS : this.role() === 'consignor' ? CONSIGNOR_STEPS : [],
  );
  protected readonly current = computed<StepDef>(() => this.steps()[this.step()] ?? CONSIGNOR_STEPS[0]);

  protected readonly merchantPct = computed(() => 100 - this.consignorPct());

  /** Cambia con cualquier campo de los formularios, para que los resúmenes se recalculen. */
  private readonly formTick = toSignal(
    merge(
      this.accountForm.valueChanges,
      this.dniForm.valueChanges,
      this.consignorLocationForm.valueChanges,
      this.businessForm.valueChanges,
      this.pdvForm.valueChanges,
      this.conditionsForm.valueChanges,
    ),
  );

  protected readonly summary = computed<SummaryRow[]>(() => {
    this.formTick();
    return this.buildSummary();
  });

  protected readonly shirtIcon = Shirt;
  protected readonly storeIcon = Store;
  protected readonly mailIcon = Mail;
  protected readonly timeOptions: DropdownOption[] = TIME_SLOTS.map((t) => ({ value: t, label: t }));
  protected readonly payDays = Array.from({ length: 28 }, (_, i) => i + 1);
  protected readonly daysText = computed(() => daysLabel(this.daysSel()));

  protected readonly wizardSteps = computed<WizardStep[]>(() =>
    this.steps().map((st) => ({ label: st.label, title: st.title, lead: st.sub })),
  );

  protected readonly commissionSegments = computed<StackSegment[]>(() => [
    { label: 'Comercio', value: this.merchantPct(), display: this.merchantPct() + ' %', color: '#F2B636' },
    { label: 'Cedente', value: this.consignorPct(), display: this.consignorPct() + ' %', color: '#1F3A2B' },
  ]);

  /** Resumen "Tu cuenta" del costado: cada fila se completa cuando se pasa su paso. */
  protected readonly sideSummary = computed<WizardSummaryRow[]>(() => {
    this.formTick();
    const passed = (id: string): boolean => this.steps().findIndex((st) => st.id === id) < this.step();
    const a = this.accountForm.getRawValue();
    if (this.role() === 'merchant') {
      const biz = this.businessForm.getRawValue();
      const pdv = this.pdvForm.getRawValue();
      const c = this.conditionsForm.getRawValue();
      return [
        { label: 'Responsable', value: passed('account') ? a.name || null : null },
        { label: 'Comercio', value: passed('business') ? biz.businessName || null : null },
        { label: 'Punto de venta', value: passed('pdv') ? pdv.spName || null : null },
        { label: 'Recepción', value: passed('pdv') ? `${this.daysText()} · ${this.fromTime()} a ${this.toTime()}` : null },
        { label: 'Tu comisión', value: passed('commission') ? `${this.merchantPct()} %` : null },
        { label: 'Día de pago', value: passed('conditions') ? `El ${c.payoutDay} de cada mes` : null },
      ];
    }
    const loc = this.consignorLocationForm.getRawValue();
    return [
      { label: 'Nombre', value: passed('account') ? [a.firstName, a.lastName].filter(Boolean).join(' ') || null : null },
      { label: 'Email', value: passed('account') ? a.email || null : null },
      { label: 'DNI', value: passed('dni') ? this.dniForm.controls.dni.value || null : null },
      { label: 'Zona', value: passed('location') && loc.neighborhood ? `${loc.neighborhood}, ${loc.city}` : null },
    ];
  });

  protected readonly doneTitle = computed(() =>
    this.role() === 'merchant'
      ? 'Tu comercio ya puede recibir consignaciones'
      : 'Tu cuenta de cedente está lista',
  );
  protected readonly doneSub = computed(() =>
    this.role() === 'merchant'
      ? `Los cedentes de tu zona ya ven a ${this.businessForm.controls.businessName.value || 'tu comercio'} entre los comercios disponibles, con tu comisión y condiciones publicadas.`
      : 'Podés cargar tu primer artículo y enviarlo como propuesta al comercio que elijas.',
  );
  protected readonly panelHref = computed(() => (this.role() === 'merchant' ? '/m' : '/c'));
  protected readonly panelLabel = computed(() =>
    this.role() === 'merchant' ? 'Ir al panel del comercio' : 'Ir al panel del cedente',
  );

  constructor() {
    // Permite entrar directo al formulario desde la landing/login: /register?rol=cedente|comercio
    const rol = inject(ActivatedRoute).snapshot.queryParamMap.get('rol');
    if (rol === 'cedente') this.pick('consignor');
    else if (rol === 'comercio') this.pick('merchant');
  }

  protected pick(role: Role): void {
    this.role.set(role);
    this.step.set(0);
    this.view.set('wizard');
  }

  protected passwordMismatch(): boolean {
    const { password, password2 } = this.accountForm.controls;
    return !!password2.value && password.value !== password2.value;
  }

  protected hoursValid(): boolean {
    return TIME_SLOTS.indexOf(this.fromTime()) < TIME_SLOTS.indexOf(this.toTime());
  }

  protected commissionValid(): boolean {
    const p = this.consignorPct();
    return p >= 40 && p <= 95;
  }

  protected example(pct: number): string {
    return '$' + Math.round((20000 * pct) / 100).toLocaleString('es-AR');
  }

  protected coordsLabel(coords: Coords): string {
    return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  }

  protected toggleDay(index: number): void {
    this.daysSel.update((sel) => sel.map((on, i) => (i === index ? !on : on)));
  }

  protected setFrom(value: string): void {
    this.fromTime.set(value);
    if (!this.hoursValid()) {
      const next = TIME_SLOTS[Math.min(TIME_SLOTS.indexOf(value) + 1, TIME_SLOTS.length - 1)];
      this.toTime.set(next);
    }
  }

  protected setTo(value: string): void {
    this.toTime.set(value);
  }

  protected setMerchantPct(value: string): void {
    const n = Number(value);
    if (Number.isFinite(n)) this.consignorPct.set(Math.max(0, Math.min(100, 100 - n)));
  }

  protected goToStep(i: number): void {
    if (i >= 0 && i < this.step()) {
      this.showErrors.set(false);
      this.submitError.set('');
      this.step.set(i);
    }
  }

  protected setConsignorPct(value: string): void {
    const n = Number(value);
    this.consignorPct.set(Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0);
  }

  protected setCode(value: string): void {
    this.code.set(value.replace(/\D/g, '').slice(0, 6));
  }

  // The consignor uses first/last name, the merchant a single name; names have no form validators
  // (they differ by role), so check the right ones here.
  private accountNamesValid(): boolean {
    const { name, firstName, lastName } = this.accountForm.controls;
    return this.role() === 'merchant'
      ? !!name.value?.trim()
      : !!firstName.value?.trim() && !!lastName.value?.trim();
  }

  protected canAdvance(): boolean {
    switch (this.current().id) {
      case 'account':
        return this.accountForm.valid && this.accountNamesValid() && !this.passwordMismatch();
      case 'dni':
        return this.dniForm.valid;
      case 'location':
        return this.consignorLocationForm.valid;
      case 'business':
        return this.businessForm.valid;
      case 'pdv':
        return this.pdvForm.valid && this.daysSel().some(Boolean) && this.hoursValid();
      case 'commission':
        return this.commissionValid();
      case 'conditions':
        return this.conditionsForm.valid;
      case 'terms':
        return this.accepted();
      default:
        return false;
    }
  }

  // Muestra el error de un campo del formulario reactivo cuando fue tocado o
  // cuando el usuario ya intentó avanzar.
  protected showError(form: FormGroup, name: string): boolean {
    const control = form.get(name);
    return !!control && control.invalid && (control.touched || this.showErrors());
  }

  protected errorMessage(form: FormGroup, name: string): string {
    const control = form.get(name);
    const errors = control?.errors;
    if (!errors) return '';
    if (errors['required']) return 'Este campo es obligatorio.';
    if (errors['email']) return 'Ingresá un email válido.';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
    if (errors['min']) return `El mínimo es ${errors['min'].min}.`;
    if (errors['max']) return `El máximo es ${errors['max'].max}.`;
    if (errors['pattern']) {
      if (name === 'dni') return 'El DNI debe tener 7 u 8 dígitos, sin puntos.';
      if (name === 'cuit') return 'El CUIT debe tener 11 dígitos, sin guiones.';
      return 'El formato no es válido.';
    }
    return 'Revisá este dato.';
  }

  private backendMessage(err: HttpErrorResponse): string {
    const detail = err.error?.message;
    return Array.isArray(detail) ? detail[0] : typeof detail === 'string' ? detail : '';
  }

  // Formulario reactivo del paso actual (los pasos custom devuelven null).
  private stepForm(): FormGroup | null {
    switch (this.current().id) {
      case 'account':
        return this.accountForm;
      case 'dni':
        return this.dniForm;
      case 'location':
        return this.consignorLocationForm;
      case 'business':
        return this.businessForm;
      case 'pdv':
        return this.pdvForm;
      case 'conditions':
        return this.conditionsForm;
      default:
        return null;
    }
  }

  private revealErrors(): void {
    this.stepForm()?.markAllAsTouched();
    this.showErrors.set(true);
    setTimeout(() =>
      document
        .querySelector('.t-error, .t-input-error')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  }

  protected next(): void {
    if (!this.canAdvance()) {
      this.revealErrors();
      return;
    }
    this.showErrors.set(false);
    if (this.step() < this.steps().length - 1) {
      this.step.update((v) => v + 1);
    }
  }

  protected back(): void {
    this.showErrors.set(false);
    this.submitError.set('');
    if (this.step() === 0) {
      this.view.set('role');
      this.role.set(null);
      return;
    }
    this.step.update((v) => v - 1);
  }

  protected submit(): void {
    if (this.submitting()) return;
    if (!this.canAdvance()) {
      this.revealErrors();
      return;
    }
    this.submitError.set('');
    this.submitting.set(true);
    const request$ =
      this.role() === 'merchant'
        ? this.auth.registerMerchant(this.buildMerchantRequest())
        : this.auth.registerConsignor(this.buildConsignorRequest());

    request$.subscribe({
      next: () => {
        // Account created and session started; the backend has emailed the verification code.
        this.code.set('');
        this.codeError.set('');
        this.view.set('verify');
        this.submitting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const message =
          err.status === 409
            ? 'Ese email ya está registrado. Probá con otro o ingresá a tu cuenta.'
            : err.status === 0
              ? 'No pudimos conectarnos con el servidor. Probá de nuevo en unos minutos.'
              : this.backendMessage(err) || 'No pudimos crear la cuenta. Revisá los datos e intentá de nuevo.';
        this.submitError.set(message);
        this.toast.show(message, 'error');
      },
    });
  }

  protected verify(): void {
    if (this.code().length < 6 || this.verifying()) return;
    this.verifying.set(true);
    this.codeError.set('');
    this.auth.verifyEmail(this.code()).subscribe({
      next: () => {
        this.verified.set(true);
        this.verifying.set(false);
        this.view.set('done');
      },
      error: (err: { error?: { message?: string } }) => {
        this.verifying.set(false);
        this.codeError.set(err.error?.message ?? 'El código no coincide o venció.');
      },
    });
  }

  protected resend(): void {
    if (this.resending()) return;
    this.resending.set(true);
    this.codeError.set('');
    this.auth.resendCode().subscribe({
      next: () => {
        this.resending.set(false);
        this.toast.show('Te enviamos un nuevo código', 'success');
      },
      error: () => {
        this.resending.set(false);
        this.toast.show('No pudimos reenviar el código', 'error');
      },
    });
  }

  // Lets the user reach their panel without verifying now; the account stays unverified.
  protected finish(): void {
    this.view.set('done');
  }

  private buildConsignorRequest(): RegisterConsignorRequest {
    const account = this.accountForm.getRawValue();
    const location = this.consignorLocationForm.getRawValue();
    return {
      firstName: account.firstName!.trim(),
      lastName: account.lastName!.trim(),
      email: account.email!,
      phone: account.phone!,
      password: account.password!,
      dni: this.dniForm.controls.dni.value!,
      bankDetails: this.dniForm.controls.bankDetails.value!.trim(),
      location: {
        street: location.street!,
        number: location.number!,
        unit: location.unit?.trim() || undefined,
        neighborhood: location.neighborhood!,
        city: location.city!,
        lat: this.consignorGeo().lat,
        lng: this.consignorGeo().lng,
      },
    };
  }

  private buildMerchantRequest(): RegisterMerchantRequest {
    const account = this.accountForm.getRawValue();
    const business = this.businessForm.getRawValue();
    const pdv = this.pdvForm.getRawValue();
    const conditions = this.conditionsForm.getRawValue();
    return {
      name: account.name!,
      email: account.email!,
      phone: account.phone!,
      password: account.password!,
      businessName: business.businessName!,
      cuit: business.cuit!,
      location: {
        neighborhood: business.neighborhood!,
        city: business.city!,
        lat: this.merchantGeo().lat,
        lng: this.merchantGeo().lng,
      },
      commissionConfig: {
        consignorPercentage: this.consignorPct(),
        merchantPercentage: this.merchantPct(),
      },
      terms: {
        saleWindowMonths: Number(conditions.saleWindowMonths),
        graceMonths: Number(conditions.graceMonths),
        payoutDay: Number(conditions.payoutDay),
      },
      salesPoint: {
        name: pdv.spName!,
        address: pdv.spAddress!,
        phone: pdv.spPhone!,
        geo: this.merchantGeo(),
        receptionSchedule: {
          days: daysLabel(this.daysSel()),
          hours: `${this.fromTime()} a ${this.toTime()}`,
          instructions: pdv.spInstructions?.trim() || 'Consultar en el mostrador al llegar.',
        },
      },
    };
  }

  private buildSummary(): SummaryRow[] {
    const account = this.accountForm.getRawValue();
    if (this.role() === 'merchant') {
      const business = this.businessForm.getRawValue();
      const pdv = this.pdvForm.getRawValue();
      const conditions = this.conditionsForm.getRawValue();
      return [
        { key: 'Comercio', value: business.businessName || '—' },
        { key: 'CUIT', value: business.cuit || '—' },
        { key: 'Responsable', value: account.name || '—' },
        { key: 'Email', value: account.email || '—' },
        {
          key: 'Punto de venta',
          value: pdv.spAddress ? `${pdv.spName} · ${pdv.spAddress}` : '—',
        },
        {
          key: 'Recepción',
          value: `${daysLabel(this.daysSel()) || '—'} · ${this.fromTime()} a ${this.toTime()}`,
        },
        { key: 'Geolocalización del local', value: this.coordsLabel(this.merchantGeo()) },
        {
          key: 'Comisión',
          value: `${this.consignorPct()} % cedente / ${this.merchantPct()} % comercio`,
        },
        {
          key: 'Condiciones',
          value: `${conditions.saleWindowMonths} meses + ${conditions.graceMonths} de gracia · pago el ${conditions.payoutDay}`,
        },
      ];
    }
    const location = this.consignorLocationForm.getRawValue();
    const street = [location.street, location.number].filter(Boolean).join(' ');
    const address = [street, location.unit].filter(Boolean).join(', ');
    return [
      {
        key: 'Nombre',
        value: [account.firstName, account.lastName].filter(Boolean).join(' ') || '—',
      },
      { key: 'Email', value: account.email || '—' },
      { key: 'Teléfono', value: account.phone || '—' },
      { key: 'DNI', value: this.dniForm.controls.dni.value || '—' },
      { key: 'Dirección', value: address || '—' },
      {
        key: 'Zona',
        value: location.neighborhood ? `${location.neighborhood}, ${location.city}` : '—',
      },
    ];
  }
}
