import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AppStateService } from './core/services/app-state.service';
import { ThemeService } from './core/services/theme.service';
import { PwaService } from './core/services/pwa.service';

interface NavItem {
  path: string;
  label: string;
  short: string;
  icon: string;
  mobile: boolean;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly state = inject(AppStateService);
  protected readonly theme = inject(ThemeService);
  protected readonly pwa = inject(PwaService);
  private readonly router = inject(Router);

  protected readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', short: 'Dashboard', icon: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z', mobile: true },
    { path: '/aposta', label: 'Minha Aposta', short: 'Aposta', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-5 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm10 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-5 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z', mobile: true },
    { path: '/progressao', label: 'Progressão', short: 'Progressão', icon: 'M3 17l6-6 4 4 8-8v4h2V3h-8v2h4l-6 6-4-4-8 8z', mobile: true },
    { path: '/premiacoes', label: 'Premiações', short: 'Prêmios', icon: 'M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v1a5 5 0 0 0 4.4 5A5 5 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5 5 0 0 0 3.6-2.9A5 5 0 0 0 21 8V7a2 2 0 0 0-2-2zM5 8V7h2v3.8A3 3 0 0 1 5 8zm14 0a3 3 0 0 1-2 2.8V7h2z', mobile: false },
    { path: '/historico', label: 'Histórico', short: 'Histórico', icon: 'M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.1 5l-1.4 1.4A9 9 0 1 0 13 3zm-1 5v5l4.3 2.5.7-1.2-3.5-2.1V8z', mobile: true },
    { path: '/configuracoes', label: 'Configurações', short: 'Config.', icon: 'M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.3 7.3 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.3 7.3 0 0 0-1.7 1l-2.5-1-2 3.5L6.5 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.3 7.3 0 0 0 1.7 1L11 21h4l.4-2.9a7.3 7.3 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z', mobile: true },
  ];
  protected readonly mobileNav = this.nav.filter((n) => n.mobile);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly isOnboarding = computed(() => this.url().startsWith('/boas-vindas'));
}
