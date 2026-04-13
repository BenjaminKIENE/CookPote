import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private counter = 0;
  readonly toasts = signal<Toast[]>([]);

  success(message: string, duration = 4000): void { this.add('success', message, duration); }
  error(message: string, duration = 5000): void   { this.add('error', message, duration); }
  info(message: string, duration = 4000): void    { this.add('info', message, duration); }
  warning(message: string, duration = 4000): void { this.add('warning', message, duration); }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private add(type: ToastType, message: string, duration: number): void {
    const id = ++this.counter;
    this.toasts.update(list => {
      const next = [...list, { id, type, message, duration }];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }
}
