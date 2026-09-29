import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { MAX_PROGRESSION_ROUNDS } from '../../core/models/defaults';
import { PrizeTier, ResultBasis } from '../../core/models/models';
import { BrlPipe, NumPipe } from '../../shared/pipes/format.pipes';
import { TierSelectorComponent } from '../../shared/components/tier-selector.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { IconComponent } from '../../shared/components/icon.component';
import { AmountComponent } from '../../shared/components/amount.component';
import { GrowthAlertComponent } from '../../shared/components/widgets';
import { ProgressaoTableComponent } from './progressao-table.component';
import { ProgressaoChartComponent } from './progressao-chart.component';
import { JogosPorRodadaComponent, LinhaDoTempoComponent } from './progressao-steps.component';

const PRESETS = [1.5, 2, 3];

@Component({
  selector: 'app-progressao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BrlPipe,
    NumPipe,
    TierSelectorComponent,
    DisclaimerComponent,
    IconComponent,
    AmountComponent,
    GrowthAlertComponent,
    ProgressaoTableComponent,
    ProgressaoChartComponent,
    JogosPorRodadaComponent,
    LinhaDoTempoComponent,
  ],
  templateUrl: './progressao.component.html',
  styles: `
    .params { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 0; overflow: hidden; }
    .params > div { padding: 12px 14px; border-right: 1px solid var(--bd); }
    .params > div:last-child { border-right: 0; }
    .params span { display: block; font-size: 12px; font-weight: 600; color: var(--tx2); }
    .params b { font-size: 19px; font-weight: 800; }
    @media (min-width: 1024px) { .params { min-width: 420px; } }
    .adjust summary { list-style: none; display: flex; justify-content: space-between; align-items: center; cursor: pointer; min-height: 32px; }
    .adjust summary::-webkit-details-marker { display: none; }
    .adjust summary app-icon { color: var(--tx3); transition: transform 220ms var(--ease); }
    .adjust[open] summary app-icon { transform: rotate(180deg); }
    .adjust .fields { margin-top: 16px; }
    .risk { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .risk > div { background: var(--sf2); border-radius: var(--r-md); padding: 12px 14px; }
    .risk span { display: block; font-size: 12.5px; font-weight: 600; color: var(--tx2); }
    .risk b { font-size: 24px; line-height: 30px; }
    .swipe { display: none; }
    @media (max-width: 767px) { .swipe { display: inline; } }
  `,
})
export class ProgressaoComponent {
  protected readonly state = inject(AppStateService);
  protected readonly prog = this.state.progression;
  protected readonly presets = PRESETS;
  protected readonly maxRounds = MAX_PROGRESSION_ROUNDS;
  protected readonly customOpen = signal(false);
  protected readonly customMode = computed(() => !PRESETS.includes(this.prog().multiplier));
  protected readonly tier = signal<PrizeTier>(this.state.selectedTier());

  protected readonly multiplierText = computed(() => {
    const m = this.prog().multiplier;
    if (m === 2) return 'dobra a cada rodada';
    if (m === 3) return 'triplica a cada rodada';
    return `×${m.toString().replace('.', ',')} a cada rodada`;
  });
  /** Crescimento percentual da rodada atual para a próxima. */
  protected readonly nextIncrease = computed(() => {
    const cur = this.state.currentRow().investment;
    return cur > 0 ? Math.round((this.state.nextRow().investment / cur - 1) * 100) : 0;
  });

  protected setMultiplier(value: number): void {
    if (!Number.isFinite(value) || value < 1) return;
    this.state.update('progression', { multiplier: Math.min(10, Math.round(value * 100) / 100) });
    if (PRESETS.includes(value)) this.customOpen.set(false);
  }

  protected stepMultiplier(dir: 1 | -1): void {
    this.customOpen.set(true);
    this.setMultiplier(Math.max(1, Math.round((this.prog().multiplier + dir * 0.1) * 10) / 10));
  }

  protected setInt(key: 'initialGames' | 'rounds', value: number, min: number, max: number): void {
    const n = Math.round(value);
    if (!Number.isFinite(n)) return;
    const v = Math.min(max, Math.max(min, n));
    const patch: Record<string, number> = { [key]: v };
    if (key === 'rounds' && this.prog().currentRound > v) patch['currentRound'] = v;
    this.state.update('progression', patch);
  }

  protected setBasis(value: ResultBasis): void {
    this.state.update('progression', { resultBasis: value });
  }
}
