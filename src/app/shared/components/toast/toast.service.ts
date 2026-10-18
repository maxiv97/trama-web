import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: number;
  title: string;
  body: string;
  type: ToastType;
}

/** Tiempo visible; el hilo de abajo se descose en este lapso (handoff §4.10). */
export const TOAST_DISMISS_MS = 5000;

/** Los errores siempre dicen qué hacer después, aunque el llamador no lo indique. */
const DEFAULT_BODY: Record<ToastType, string> = {
  success: '',
  error: 'Revisá tu conexión e intentá de nuevo.',
  warning: '',
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly toasts = signal<ToastMessage[]>([]);

  readonly messages = this.toasts.asReadonly();

  show(title: string, type: ToastType = 'success', body?: string): void {
    const id = ++this.sequence;
    const message: ToastMessage = { id, title, type, body: body ?? DEFAULT_BODY[type] };
    this.toasts.update((list) => [...list, message]);
    setTimeout(() => this.dismiss(id), TOAST_DISMISS_MS);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
