import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SupportService, TicketRole } from '../../../core/services/support.service';
import { Dropdown } from '../../../shared/components/dropdown/dropdown';
import { PhotoUploader } from '../../../shared/components/photo-uploader/photo-uploader';
import { ResultScreen } from '../../../shared/components/result-screen/result-screen';
import { Stitch } from '../../../shared/components/stitch/stitch';
import { Segmented, TabOption } from '../../../shared/components/tabs/tabs';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { HelpAnalytics } from './help-analytics.service';
import { HelpFaqItem } from './help-faq-item';
import { HelpLayout } from './help-layout';
import { HelpState } from './help-state.service';
import { FAQS, HelpMotivo, isMotivo, matchesRole, MOTIVOS } from './help.content';

const ROLE_FIELD_OPTIONS: readonly TabOption<TicketRole>[] = [
  { value: 'cedente', label: 'Cedente' },
  { value: 'comercio', label: 'Comercio' },
  { value: 'sin-cuenta', label: 'Todavía no tengo cuenta' },
];

/** Motivos que van directo al formulario, sin sugerir preguntas. */
const DIRECT: readonly HelpMotivo[] = ['problema', 'otro'];

const PLACEHOLDER: Record<HelpMotivo, string> = {
  cuenta: 'Contanos qué pasa con tu registro o tu cuenta.',
  recepcion: 'Contanos qué prenda es, en qué comercio y qué pasó en la recepción.',
  plazos: 'Contanos qué prenda o comercio es y qué plazo te genera dudas.',
  precios: 'Contanos qué prenda es y qué parte del precio o la comisión no te cierra.',
  liquidaciones: 'Contanos el mes y el comercio.',
  'no-vendidas': 'Contanos qué prenda es y en qué comercio está.',
  discrepancias: 'Contanos qué prenda es y qué observación registró el comercio.',
  ubicacion: 'Contanos tu barrio o ciudad y qué esperabas ver.',
  problema: 'Contanos qué estabas haciendo, en qué pantalla y qué mensaje apareció.',
  otro: 'Contanos tu consulta.',
};

/** Tope de la captura: 5 MB de imagen (el data URL en base64 pesa ~4/3 más). */
const MAX_CAPTURE_BYTES = 5 * 1024 * 1024;

/**
 * /ayuda/contacto: el ticket es el último paso. Paso 1, motivo y preguntas sugeridas; paso 2, datos.
 * Acepta ?motivo= y ?q= para precargar. El ticket llega por email a la casilla de Trama.
 */
@Component({
  selector: 'app-help-contact',
  imports: [ReactiveFormsModule, RouterLink, Dropdown, PhotoUploader, ResultScreen, Stitch, Segmented, HelpFaqItem, HelpLayout],
  template: `
    <app-help-layout>
      <div class="mx-auto max-w-[720px] px-4 py-8 sm:px-6 sm:py-12">
        @if (ticketId(); as id) {
          <div class="t-card-raised px-5 sm:px-8">
            <app-result-screen
              eyebrow="Contacto"
              title="Recibimos tu consulta"
              [body]="'Te vamos a responder a ' + sentTo() + '. También te enviamos una copia con el número de consulta.'"
            >
              <div summary class="t-summary text-left">
                <p class="relative text-[13px] text-trama-muted">Número de consulta</p>
                <p class="relative font-display text-[22px] font-bold tracking-[0.02em] text-trama-dark">{{ id }}</p>
              </div>
              <ng-container actions>
                <a routerLink="/ayuda" class="t-btn t-btn-primary">Volver a la ayuda</a>
                <a routerLink="/" class="t-btn t-btn-secondary">Ir al inicio</a>
              </ng-container>
            </app-result-screen>
          </div>
        } @else {
          <nav aria-label="Migas" class="text-sm text-trama-muted">
            <a routerLink="/ayuda" class="hover:text-trama-dark hover:underline">Ayuda</a>
            <span aria-hidden="true"> / </span><span class="text-trama-dark">Contacto</span>
          </nav>
          <h1 class="text-title-1 mt-4 text-trama-dark">Escribinos</h1>
          <app-stitch class="mt-3" variant="knot" [width]="110" [animate]="true" [delay]="150" />
          <p class="text-lead mt-3 text-trama-body">Elegí el motivo de tu consulta. Antes de escribir, fijate si alguna de estas respuestas te sirve.</p>

          <!-- Paso 1: motivo -->
          <section class="t-card-raised mt-7 p-5 sm:p-7" aria-labelledby="paso-1">
            <p id="paso-1" class="text-eyebrow">Paso 1 · Motivo</p>
            <label class="t-label mt-3" for="motivo">¿Sobre qué es tu consulta?</label>
            <app-dropdown
              inputId="motivo"
              ariaLabel="Motivo de la consulta"
              placeholder="Elegí un motivo"
              [options]="motivos"
              [invalid]="motivoError()"
              [value]="motivo() ?? ''"
              (valueChange)="chooseMotivo($event)"
            />
            @if (motivoError()) {
              <p class="t-error">Elegí un motivo.</p>
            }

            @if (motivo() && suggestions().length) {
              <div class="mt-6">
                <p class="text-[15px] font-bold text-trama-dark">Quizás te sirva</p>
                <div class="mt-3 space-y-2.5">
                  @for (f of suggestions(); track f.id) {
                    <app-help-faq-item
                      [faq]="f"
                      [open]="openFaqs().has(f.id)"
                      [showRole]="false"
                      [copyable]="false"
                      [anchor]="false"
                      (toggle)="toggleFaq(f.id, $event)"
                    />
                  }
                </div>
                @if (!step2()) {
                  <button type="button" class="t-btn t-btn-secondary mt-5" (click)="revealForm()">Ya lo revisé, quiero escribir</button>
                }
              </div>
            } @else if (motivo() && !step2()) {
              <button type="button" class="t-btn t-btn-secondary mt-5" (click)="revealForm()">Continuar</button>
            }
          </section>

          <!-- Paso 2: datos -->
          @if (step2()) {
            <form
              #formEl
              class="t-card-raised t-fade-in mt-5 p-5 sm:p-7"
              [formGroup]="form"
              (ngSubmit)="submit()"
              novalidate
              aria-labelledby="paso-2"
            >
              <p id="paso-2" class="text-eyebrow">Paso 2 · Tus datos</p>

              <p class="t-label mt-4" id="rol-label">Sos</p>
              <app-segmented
                ariaLabel="Sos"
                [onPage]="true"
                [options]="roleFieldOptions"
                [value]="form.controls.rol.value"
                (valueChange)="form.controls.rol.setValue($event)"
              />

              <label class="t-label mt-5" for="nombre">Nombre</label>
              <input id="nombre" class="t-input" formControlName="nombre" autocomplete="name" [attr.aria-invalid]="err('nombre') ? true : null" />
              @if (err('nombre'); as e) {
                <p class="t-error">{{ e }}</p>
              }

              <label class="t-label mt-4" for="email">Email</label>
              <input id="email" type="email" class="t-input" formControlName="email" autocomplete="email" placeholder="tu@email.com" [attr.aria-invalid]="err('email') ? true : null" />
              @if (err('email'); as e) {
                <p class="t-error">{{ e }}</p>
              } @else {
                <p class="t-help">Te respondemos a esta dirección.</p>
              }

              <label class="t-label mt-4" for="mensaje">Mensaje</label>
              <textarea
                id="mensaje"
                class="t-input min-h-[150px] resize-y"
                formControlName="mensaje"
                [placeholder]="placeholder()"
                [attr.maxlength]="2000"
                [attr.aria-invalid]="err('mensaje') ? true : null"
                aria-describedby="mensaje-count"
              ></textarea>
              <div class="flex items-start justify-between gap-3">
                @if (err('mensaje'); as e) {
                  <p class="t-error">{{ e }}</p>
                } @else {
                  <span></span>
                }
                <p id="mensaje-count" class="t-help shrink-0 tabular-nums" aria-live="polite">{{ messageLength() }} / 2000</p>
              </div>

              @if (motivo() === 'problema') {
                <p class="t-label mt-4">Captura de pantalla <span class="font-normal text-trama-muted">(opcional)</span></p>
                <app-photo-uploader [max]="1" [suggestions]="['Captura']" [photos]="capture()" (photosChange)="onCapture($event)" (failed)="toast.show($event, 'error')" />
                @if (captureError()) {
                  <p class="t-error">La imagen supera los 5 MB. Probá con una captura más liviana.</p>
                }
              }

              <!-- Honeypot: invisible para personas -->
              <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <label for="website">No completar</label>
                <input id="website" tabindex="-1" autocomplete="off" formControlName="website" />
              </div>

              <button type="submit" class="t-btn t-btn-primary mt-6 w-full sm:w-auto" [disabled]="sending()">
                @if (sending()) {
                  <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true"></span>
                  Enviando…
                } @else {
                  Enviar consulta
                }
              </button>
            </form>
          }
        }
      </div>
    </app-help-layout>
  `,
})
export class HelpContact implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly support = inject(SupportService);
  private readonly state = inject(HelpState);
  private readonly analytics = inject(HelpAnalytics);
  protected readonly toast = inject(ToastService);
  private readonly formEl = viewChild<ElementRef<HTMLFormElement>>('formEl');

  protected readonly motivos = MOTIVOS.map((m) => ({ value: m.value, label: m.label }));
  protected readonly roleFieldOptions = ROLE_FIELD_OPTIONS;

  protected readonly motivo = signal<HelpMotivo | null>(null);
  protected readonly motivoError = signal(false);
  protected readonly step2 = signal(false);
  protected readonly openFaqs = signal<ReadonlySet<string>>(new Set());
  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly ticketId = signal<string | null>(null);
  protected readonly sentTo = signal('');
  protected readonly capture = signal<string[]>([]);
  protected readonly captureError = signal(false);
  private readonly messageValue = signal('');
  private origin = '';

  protected readonly form = this.fb.nonNullable.group({
    rol: this.fb.nonNullable.control<TicketRole>('sin-cuenta'),
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    mensaje: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    website: [''],
  });

  protected readonly suggestions = computed(() => {
    const m = this.motivo();
    if (!m || DIRECT.includes(m)) return [];
    return FAQS.filter((f) => f.motivo === m && matchesRole(f.rol, this.state.role())).slice(0, 3);
  });
  protected readonly placeholder = computed(() => PLACEHOLDER[this.motivo() ?? 'otro']);
  protected readonly messageLength = computed(() => this.messageValue().length);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.state.syncFromUrl(params.get('rol'));
    this.origin = this.state.origin();

    const role = this.auth.role();
    const user = this.auth.user();
    if (role) this.form.controls.rol.setValue(role === 'consignor' ? 'cedente' : 'comercio');
    else if (this.state.role() !== 'todos') this.form.controls.rol.setValue(this.state.role() as TicketRole);
    if (user) {
      this.form.controls.nombre.setValue(user.name);
      this.auth.me().subscribe({
        next: (me) => {
          if (me.email && !this.form.controls.email.value) this.form.controls.email.setValue(me.email);
        },
        error: () => {
          /* sin email precargado: se completa a mano */
        },
      });
    }

    const q = params.get('q');
    if (q) this.form.controls.mensaje.setValue(q);
    this.messageValue.set(this.form.controls.mensaje.value);
    this.form.controls.mensaje.valueChanges.subscribe((v) => this.messageValue.set(v));

    const motivo = params.get('motivo');
    if (isMotivo(motivo)) this.chooseMotivo(motivo);
  }

  protected chooseMotivo(value: string): void {
    if (!isMotivo(value)) return;
    this.motivo.set(value);
    this.motivoError.set(false);
    if (DIRECT.includes(value)) this.step2.set(true);
    if (value !== 'problema') {
      this.capture.set([]);
      this.captureError.set(false);
    }
  }

  protected toggleFaq(id: string, open: boolean): void {
    const next = new Set(this.openFaqs());
    if (open) {
      next.add(id);
      this.state.markViewed(id);
    } else next.delete(id);
    this.openFaqs.set(next);
  }

  protected revealForm(): void {
    this.step2.set(true);
    setTimeout(() => {
      const form = this.formEl()?.nativeElement;
      if (!form) return;
      window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' });
      (form.querySelector('#nombre') as HTMLInputElement | null)?.focus({ preventScroll: true });
    });
  }

  protected onCapture(photos: string[]): void {
    this.capture.set(photos);
    const data = photos[0];
    this.captureError.set(!!data && Math.floor((data.length - data.indexOf(',') - 1) * 0.75) > MAX_CAPTURE_BYTES);
  }

  /** Mensaje de error del campo: al salir del campo (touched) o al intentar enviar. */
  protected err(name: 'nombre' | 'email' | 'mensaje'): string | null {
    const c = this.form.controls[name];
    if (!c.invalid || !(c.touched || this.submitted())) return null;
    const e = c.errors ?? {};
    if (name === 'nombre') {
      if (e['required']) return 'Ingresá tu nombre.';
      return 'El nombre tiene que tener entre 2 y 80 caracteres.';
    }
    if (name === 'email') {
      if (e['required']) return 'Ingresá tu email.';
      return 'Ingresá un email válido.';
    }
    if (e['required']) return 'Escribí tu consulta.';
    if (e['minlength']) return 'Contanos un poco más: al menos 20 caracteres.';
    return 'El mensaje puede tener hasta 2000 caracteres.';
  }

  protected submit(): void {
    if (this.sending()) return;
    this.submitted.set(true);
    const motivo = this.motivo();
    if (!motivo) {
      this.motivoError.set(true);
      return;
    }
    if (this.form.invalid || this.captureError()) {
      this.form.markAllAsTouched();
      const first = this.formEl()?.nativeElement.querySelector('[aria-invalid="true"]') as HTMLElement | null;
      first?.focus();
      return;
    }
    const v = this.form.getRawValue();
    this.sending.set(true);
    this.support
      .createTicket({
        motivo,
        rol: v.rol,
        nombre: v.nombre.trim(),
        email: v.email.trim(),
        mensaje: v.mensaje.trim(),
        origen: this.origin || undefined,
        faqsVistas: this.state.viewedFaqs(),
        captura: motivo === 'problema' ? this.capture()[0] : undefined,
        website: v.website || undefined,
      })
      .subscribe({
        next: ({ ticketId }) => {
          this.sending.set(false);
          this.sentTo.set(v.email.trim());
          this.ticketId.set(ticketId);
          this.analytics.track({ type: 'ticket_sent', motivo });
          window.scrollTo({ top: 0 });
        },
        error: (err: HttpErrorResponse) => {
          this.sending.set(false);
          if (err.status === 429) {
            this.toast.show('Recibimos varias consultas desde este email', 'error', 'Probá de nuevo en una hora.');
          } else if (err.status === 400) {
            this.toast.show('No pudimos enviar tu consulta', 'error', 'Revisá los datos del formulario.');
          } else {
            this.toast.show('No pudimos enviar tu consulta', 'error');
          }
        },
      });
  }
}
