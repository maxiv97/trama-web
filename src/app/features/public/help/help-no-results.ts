import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchX } from 'lucide-angular';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { HelpState } from './help-state.service';
import { FAQS, matchesRole, TOPICS } from './help.content';

/** Búsqueda sin resultados: estado vacío, tres temas sugeridos y el camino al ticket con ?q=. */
@Component({
  selector: 'app-help-no-results',
  imports: [EmptyState, RouterLink],
  host: { class: 'block' },
  template: `
    <app-empty-state
      [title]="'No encontramos nada para «' + query() + '»'"
      message="Probá con otra palabra o revisá alguno de estos temas. Si no aparece, escribinos y lo vemos."
      [icon]="icon"
    />
    <div class="mt-5 flex flex-col items-center gap-4">
      <div class="flex flex-wrap justify-center gap-2">
        @for (t of suggested(); track t.id) {
          <a class="t-chip" routerLink="/ayuda/faq" [fragment]="t.id" [queryParams]="roleParam()">{{ t.titulo }}</a>
        }
      </div>
      <a class="t-btn t-btn-primary" routerLink="/ayuda/contacto" [queryParams]="{ q: query() }">Escribinos</a>
    </div>
  `,
})
export class HelpNoResults {
  private readonly state = inject(HelpState);
  readonly query = input.required<string>();
  protected readonly icon = SearchX;
  protected readonly suggested = computed(() =>
    TOPICS.filter((t) => FAQS.some((f) => f.tema === t.id && matchesRole(f.rol, this.state.role()))).slice(0, 3),
  );
  protected readonly roleParam = computed(() => (this.state.role() === 'todos' ? {} : { rol: this.state.role() }));
}
