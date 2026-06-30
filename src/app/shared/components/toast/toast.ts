import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="fixed right-4 top-4 z-[60] flex flex-col gap-2">
      @for (toast of toastService.messages(); track toast.id) {
        <div
          class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg"
          [class]="toast.type === 'error' ? 'bg-red-600' : 'bg-trama-brand'"
        >
          {{ toast.text }}
        </div>
      }
    </div>
  `,
})
export class Toast {
  protected readonly toastService = inject(ToastService);
}
