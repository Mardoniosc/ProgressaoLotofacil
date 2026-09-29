import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  tone?: 'danger' | 'dark' | 'primary';
  icon?: string;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Estado de interface compartilhado: diálogos de confirmação e sheets globais. */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly confirmState = signal<ConfirmState | null>(null);
  readonly infoOpen = signal(false);
  readonly betSheetOpen = signal(false);

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.confirmState()?.resolve(false);
    return new Promise((resolve) => this.confirmState.set({ ...options, resolve }));
  }

  settleConfirm(ok: boolean): void {
    const s = this.confirmState();
    this.confirmState.set(null);
    s?.resolve(ok);
  }
}
