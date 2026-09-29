import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';
import { ThemePreference } from '../models/models';
import { AppStateService } from './app-state.service';

const THEME_COLORS = { light: '#6d28d9', dark: '#1a1530' };

/** Aplica o tema (claro/escuro/sistema) salvo nas preferências. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly state = inject(AppStateService);
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly preference = computed(() => this.state.preferences().theme);
  readonly effective = computed<'light' | 'dark'>(() => {
    const pref = this.preference();
    if (pref === 'system') return this.systemDark() ? 'dark' : 'light';
    return pref;
  });

  constructor() {
    this.media?.addEventListener?.('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      const theme = this.effective();
      const root = this.document.documentElement;
      root.dataset['theme'] = theme;
      root.style.colorScheme = theme;
      this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
      // Espelho síncrono só para evitar "flash" no próximo carregamento (a fonte da verdade é o IndexedDB).
      try {
        localStorage.setItem('lp-theme', theme);
      } catch {
        /* armazenamento indisponível */
      }
    });
  }

  set(theme: ThemePreference): void {
    this.state.update('preferences', { theme });
  }

  toggle(): void {
    this.set(this.effective() === 'dark' ? 'light' : 'dark');
  }
}
