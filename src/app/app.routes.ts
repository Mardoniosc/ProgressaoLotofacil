import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AppStateService } from './core/services/app-state.service';

/** Envia para o assistente inicial enquanto o onboarding não foi concluído. */
const onboardingDone: CanActivateFn = () =>
  inject(AppStateService).preferences().onboardingCompleted || inject(Router).createUrlTree(['/boas-vindas']);

export const routes: Routes = [
  {
    path: 'boas-vindas',
    title: 'Boas-vindas',
    loadComponent: () => import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: '',
    canActivateChild: [onboardingDone],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'aposta',
        title: 'Minha Aposta',
        loadComponent: () => import('./features/aposta/aposta.component').then((m) => m.ApostaComponent),
      },
      {
        path: 'progressao',
        title: 'Progressão',
        loadComponent: () => import('./features/progressao/progressao.component').then((m) => m.ProgressaoComponent),
      },
      {
        path: 'premiacoes',
        title: 'Premiações',
        loadComponent: () => import('./features/premiacao/premiacao.component').then((m) => m.PremiacaoComponent),
      },
      {
        path: 'historico',
        title: 'Histórico',
        loadComponent: () => import('./features/historico/historico.component').then((m) => m.HistoricoComponent),
      },
      {
        path: 'configuracoes',
        title: 'Configurações',
        loadComponent: () =>
          import('./features/configuracoes/configuracoes.component').then((m) => m.ConfiguracoesComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
