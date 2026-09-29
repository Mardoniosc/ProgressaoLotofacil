import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { UiService } from '../../core/services/ui.service';
import { JogosPipe, NumPipe } from '../../shared/pipes/format.pipes';
import { AmountComponent } from '../../shared/components/amount.component';
import { ChartComponent, ChartSeries } from '../../shared/components/chart.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { IconComponent, LogoComponent } from '../../shared/components/icon.component';
import {
  BankrollCardComponent,
  GrowthAlertComponent,
  NextRoundCardComponent,
  NumberChipsComponent,
  ScenarioSimulatorComponent,
} from '../../shared/components/widgets';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    JogosPipe,
    NumPipe,
    AmountComponent,
    ChartComponent,
    DisclaimerComponent,
    IconComponent,
    LogoComponent,
    BankrollCardComponent,
    GrowthAlertComponent,
    NextRoundCardComponent,
    NumberChipsComponent,
    ScenarioSimulatorComponent,
  ],
  templateUrl: './dashboard.component.html',
  styles: `
    .m-head { display: flex; align-items: center; gap: 12px; }
    .m-head h1 { font-size: 19px; line-height: 24px; }
    .m-head p { font-size: 13.5px; color: var(--tx2); }
    .d-head { display: none; }
    @media (min-width: 1024px) { .m-head { display: none; } .d-head { display: flex; } }
    .edit { font-size: 12.5px; font-weight: 800; color: var(--pri); background: var(--pri-soft); border: 0; border-radius: 999px; padding: 4px 10px; cursor: pointer; }
    .foot { font-size: 12.5px; color: var(--tx2); margin-top: 10px; line-height: 18px; }
    .foot b { color: var(--tx); }
    .top-grid { display: grid; gap: 16px; }
    @media (min-width: 768px) { .top-grid { grid-template-columns: 1.4fr 1fr; } }
    .top-grid > .card { display: flex; flex-direction: column; justify-content: center; }
    @media (min-width: 1024px) { .top-grid { gap: 24px; } }
  `,
})
export class DashboardComponent {
  protected readonly state = inject(AppStateService);
  protected readonly ui = inject(UiService);

  protected readonly current = this.state.currentRow;
  protected readonly next = this.state.nextRow;
  protected readonly chartMode = signal<'round' | 'accumulated'>('round');
  protected readonly betComplete = computed(
    () => this.state.bet().selectedNumbers.length === this.state.bet().numbersPerGame,
  );

  protected readonly chartLabels = computed(() => this.state.progressionRows().map((r) => `R${r.round}`));
  protected readonly chartSeries = computed<ChartSeries[]>(() => {
    const rows = this.state.progressionRows();
    return this.chartMode() === 'round'
      ? [{ name: 'Investimento', values: rows.map((r) => r.investment), color: '--pri', type: 'bar' }]
      : [{ name: 'Acumulado', values: rows.map((r) => r.accumulated), color: '--pri', type: 'area' }];
  });
  protected readonly growthFactor = computed(() => {
    const rows = this.state.progressionRows();
    return rows.length > 1 ? Math.round(rows[rows.length - 1].investment / rows[0].investment) : 1;
  });

  protected async resetProgression(): Promise<void> {
    const ok = await this.ui.confirm({
      title: 'Reiniciar progressão?',
      message: 'A contagem volta para a Rodada 1. Seu histórico e configurações são mantidos.',
      confirmText: 'Reiniciar',
      tone: 'dark',
      icon: 'refresh',
    });
    if (ok) this.state.resetProgression();
  }
}
