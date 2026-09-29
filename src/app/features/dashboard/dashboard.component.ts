import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { PrizeTier } from '../../core/models/models';
import { BrlPipe, JogosPipe, PercentPipe } from '../../shared/pipes/format.pipes';
import { TierSelectorComponent } from '../../shared/components/tier-selector.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import {
  BankrollBarComponent,
  GrowthAlertComponent,
  NumberChipsComponent,
  ScenarioSimulatorComponent,
} from '../../shared/components/widgets';
import { EducationalInfoComponent } from '../../shared/components/educational-info.component';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BrlPipe,
    JogosPipe,
    PercentPipe,
    TierSelectorComponent,
    DisclaimerComponent,
    BankrollBarComponent,
    GrowthAlertComponent,
    NumberChipsComponent,
    ScenarioSimulatorComponent,
    EducationalInfoComponent,
  ],
  templateUrl: './dashboard.component.html',
  styles: `
    .round-nav { display: flex; align-items: center; gap: 8px; }
    .round-pill { font-weight: 700; padding: 6px 12px; border-radius: 999px; background: var(--primary-soft); color: var(--primary); font-size: .85rem; }
    .roi-card .value { font-size: clamp(1.1rem, 4.2vw, 1.45rem); }
  `,
})
export class DashboardComponent {
  protected readonly state = inject(AppStateService);

  protected readonly current = this.state.currentRow;
  protected readonly next = this.state.nextRow;
  protected readonly scenario = this.state.currentScenario;
  protected readonly basisLabel = computed(() =>
    this.state.progression().resultBasis === 'accumulated' ? 'sobre o acumulado' : 'sobre a rodada',
  );
  protected readonly betComplete = computed(
    () => this.state.bet().selectedNumbers.length === this.state.bet().numbersPerGame,
  );

  protected selectTier(tier: PrizeTier): void {
    this.state.setSelectedTier(tier);
  }

  protected resetProgression(): void {
    if (confirm('Voltar a progressão para a rodada 1?')) this.state.resetProgression();
  }
}
