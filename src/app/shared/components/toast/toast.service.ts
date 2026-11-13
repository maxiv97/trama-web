import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
  detail?: string;
}

export const TOAST_DURATION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly toasts = signal<ToastMessage[]>([]);

  readonly messages = this.toasts.asReadonly();

  show(text: string, type: ToastType = 'success', detail?: string): void {
    const id = ++this.sequence;
    this.toasts.update((list) => [...list, { id, text, type, detail }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
