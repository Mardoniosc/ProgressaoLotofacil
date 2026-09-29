import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AppStateService } from './core/services/app-state.service';
import { ThemeService } from './core/services/theme.service';
import { PwaService } from './core/services/pwa.service';
import { UiService } from './core/services/ui.service';
import { IconComponent, LogoComponent } from './shared/components/icon.component';
import { GlobalSheetsComponent } from './shared/components/global-sheets.component';

interface NavItem {
  path: string;
  label: string;
  short: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent, GlobalSheetsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly state = inject(AppStateService);
  protected readonly theme = inject(ThemeService);
  protected readonly pwa = inject(PwaService);
  protected readonly ui = inject(UiService);
  private readonly router = inject(Router);

  /** Sidebar (desktop). */
  protected readonly sideNav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', short: 'Início', icon: 'home' },
    { path: '/aposta', label: 'Minha aposta', short: 'Aposta', icon: 'ticket' },
    { path: '/progressao', label: 'Progressão', short: 'Progressão', icon: 'trend' },
    { path: '/premiacoes', label: 'Premiações', short: 'Prêmios', icon: 'trophy' },
    { path: '/historico', label: 'Histórico', short: 'Histórico', icon: 'clock' },
  ];
  /** Bottom navigation (mobile). "Premiações" fica acessível pelo Dashboard e pela Progressão. */
  protected readonly bottomNav: NavItem[] = [
    this.sideNav[0],
    this.sideNav[1],
    this.sideNav[2],
    this.sideNav[4],
    { path: '/configuracoes', label: 'Configurações', short: 'Config', icon: 'sliders' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly isOnboarding = computed(() => this.url().startsWith('/boas-vindas'));

  /** Divide o título em duas linhas no logotipo da sidebar ("LOTOFÁCIL / PROGRESSÃO"). */
  protected readonly titleParts = computed(() => {
    const words = this.state.preferences().appTitle.trim().split(/\s+/);
    if (words.length < 2) return [words[0] ?? '', ''];
    return [words.slice(0, -1).join(' '), words[words.length - 1]];
  });
}
