import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

const DISMISS_MS = 3000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly toasts = signal<ToastMessage[]>([]);

  readonly messages = this.toasts.asReadonly();

  show(text: string, type: ToastType = 'success'): void {
    const id = ++this.sequence;
    this.toasts.update((list) => [...list, { id, text, type }]);
    setTimeout(() => this.dismiss(id), DISMISS_MS);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
