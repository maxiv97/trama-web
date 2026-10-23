import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChevronDown, Link2, LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { HelpHighlight } from './help-highlight';
import { Faq, findGuide, ROLE_LABEL } from './help.content';

/**
 * Pregunta frecuente como acordeón accesible: <button aria-expanded aria-controls> y la respuesta en
 * una región. Se usa en /ayuda/faq y en las sugerencias del contacto.
 */
@Component({
  selector: 'app-help-faq-item',
  imports: [RouterLink, LucideAngularModule, HelpHighlight],
  host: { class: 'block' },
  template: `
    <div class="t-card overflow-hidden" [attr.id]="anchor() ? faq().id : null">
      <h3 class="m-0">
        <button
          type="button"
          class="flex min-h-[52px] w-full items-start gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-trama-sand-50/60"
          [attr.id]="'faq-btn-' + faq().id"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="'faq-panel-' + faq().id"
          (click)="toggle.emit(!open())"
        >
          <span class="min-w-0 flex-1">
            <span class="block text-[16px] font-semibold leading-snug text-trama-dark">
              <app-help-highlight [text]="faq().pregunta" [terms]="terms()" />
            </span>
            @if (showRole() && faq().rol !== 'comun') {
              <span class="mt-1.5 inline-block rounded-full bg-trama-sand-50 px-2.5 py-0.5 text-[12px] font-semibold text-trama-body">
                {{ roleLabel() }}
              </span>
            }
          </span>
          <lucide-angular
            class="chev mt-0.5 flex shrink-0 text-trama-dark"
            [class.chev-open]="open()"
            [img]="chevron"
            [size]="20"
            aria-hidden="true"
          />
        </button>
      </h3>
      @if (open()) {
        <div
          role="region"
          class="t-fade-in border-t border-trama-sand-100 px-5 pb-4 pt-3.5"
          [attr.id]="'faq-panel-' + faq().id"
          [attr.aria-labelledby]="'faq-btn-' + faq().id"
        >
          <p class="text-[15px] leading-relaxed text-trama-body">
            <app-help-highlight [text]="faq().respuesta" [terms]="terms()" />
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            @if (guide(); as g) {
              <a class="t-link" [routerLink]="['/ayuda/guia', g.slug]">Ver guía: {{ g.titulo }}</a>
            }
            @if (copyable()) {
              <button type="button" class="inline-flex min-h-[32px] items-center gap-1.5 font-semibold text-trama-body hover:text-trama-dark" (click)="copyLink()">
                <lucide-angular [img]="linkIcon" [size]="15" aria-hidden="true" /> Copiar enlace
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .chev {
      transition: transform 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
    .chev-open {
      transform: rotate(180deg);
    }
  `,
})
export class HelpFaqItem {
  private readonly toast = inject(ToastService);

  readonly faq = input.required<Faq>();
  readonly open = input(false);
  readonly terms = input<string[]>([]);
  readonly showRole = input(true);
  readonly copyable = input(true);
  /** Si el contenedor lleva el id de la pregunta (para el hash de /ayuda/faq). */
  readonly anchor = input(true);
  readonly toggle = output<boolean>();

  protected readonly chevron = ChevronDown;
  protected readonly linkIcon = Link2;
  protected readonly guide = computed(() => {
    const slug = this.faq().guia;
    return slug ? findGuide(slug) : undefined;
  });
  protected readonly roleLabel = computed(() => {
    const rol = this.faq().rol;
    return rol === 'comun' ? '' : ROLE_LABEL[rol];
  });

  protected copyLink(): void {
    const url = `${location.origin}/ayuda/faq#${this.faq().id}`;
    const done = () => this.toast.show('Enlace copiado');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done, () => this.toast.show('No pudimos copiar el enlace', 'error', url));
    } else {
      this.toast.show('Copiá este enlace', 'warning', url);
    }
  }
}
