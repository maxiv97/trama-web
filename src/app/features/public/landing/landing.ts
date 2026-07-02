import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <main class="min-h-screen bg-trama-brand text-white">
      <section class="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <h1 class="text-5xl font-semibold tracking-wide">Trama</h1>
        <p class="mt-4 text-lg text-white/80">
          Consigná tu ropa y seguí cada paso hasta cobrarla.
        </p>
        <div class="mt-10 flex gap-4">
          <a
            routerLink="/login"
            class="rounded-lg bg-white px-6 py-3 font-medium text-trama-brand hover:bg-trama-sand-100"
            >Soy cedente</a
          >
          <a
            routerLink="/login"
            class="rounded-lg border border-white px-6 py-3 font-medium text-white hover:bg-white/10"
            >Soy comercio</a
          >
        </div>
      </section>
    </main>
  `,
})
export class Landing {}
