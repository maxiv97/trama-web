import { Component, computed, input } from '@angular/core';
import { segments } from './help.search';

/** Texto con los términos de búsqueda resaltados en <mark> (#F7EBD2), sin innerHTML. */
@Component({
  selector: 'app-help-highlight',
  template: `@for (s of parts(); track $index) {@if (s.mark) {<mark class="rounded-[3px] bg-[#F7EBD2] px-px text-inherit">{{ s.text }}</mark>} @else {{{ s.text }}}}`,
})
export class HelpHighlight {
  readonly text = input.required<string>();
  readonly terms = input<string[]>([]);
  protected readonly parts = computed(() => segments(this.text(), this.terms()));
}
