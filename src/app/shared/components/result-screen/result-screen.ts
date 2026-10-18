import { Component, input } from '@angular/core';
import { CutThreadArt, SuccessArt } from '../illustrations/illustrations';
import { Stitch } from '../stitch/stitch';

/**
 * Pantalla de resultado (handoff §4.10): ilustración de éxito (tilde que se
 * dibuja) o de error (hilo cortado), título con el subrayado con nudo, cuerpo,
 * un resumen cosido de lo que acaba de pasar y hasta dos botones más un link
 * de salida. Nunca lleva una acción destructiva. En el celular los botones se
 * apilan a lo ancho con el principal arriba.
 *
 *   <app-result-screen title="…" body="…">
 *     <div summary>…</div>
 *     <ng-container actions>
 *       <a class="t-btn t-btn-primary">…</a>
 *       <a class="t-btn t-btn-secondary">…</a>
 *     </ng-container>
 *     <a exit class="t-link">Volver al panel</a>
 *   </app-result-screen>
 */
@Component({
  selector: 'app-result-screen',
  imports: [SuccessArt, CutThreadArt, Stitch],
  host: { class: 'block' },
  template: `
    <div class="flex flex-col items-center gap-3.5 px-1 py-6 text-center sm:py-10">
      @if (eyebrow()) {
        <span class="text-eyebrow mb-1">{{ eyebrow() }}</span>
      }
      @if (variant() === 'error') {
        <app-cut-thread-art [size]="150" />
      } @else {
        <app-success-art [size]="116" />
      }
      <h2 class="text-title-2 mt-1 text-balance text-trama-dark sm:text-[26px]">{{ title() }}</h2>
      @if (variant() === 'success') {
        <app-stitch variant="knot" [width]="140" [animate]="true" [delay]="800" />
      }
      @if (body()) {
        <p class="max-w-[360px] text-[15px] leading-relaxed text-trama-body">{{ body() }}</p>
      }
      <div class="w-full max-w-[380px] empty:hidden">
        <ng-content select="[summary]" />
      </div>
      <div class="t-result-actions mt-2 flex w-full max-w-[380px] flex-col gap-2.5 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
        <ng-content select="[actions]" />
      </div>
      <div class="mt-1 empty:hidden">
        <ng-content select="[exit]" />
      </div>
    </div>
  `,
})
export class ResultScreen {
  readonly title = input.required<string>();
  readonly body = input('');
  readonly eyebrow = input('');
  readonly variant = input<'success' | 'error'>('success');
}
