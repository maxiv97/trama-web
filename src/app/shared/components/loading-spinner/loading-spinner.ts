import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div class="flex min-h-[60vh] items-center justify-center">
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-trama-sand-200 border-t-trama-brand"
      ></div>
    </div>
  `,
})
export class LoadingSpinner {}
