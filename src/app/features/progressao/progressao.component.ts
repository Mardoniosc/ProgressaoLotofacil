import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { MAX_PROGRESSION_ROUNDS } from '../../core/models/defaults';
import { PrizeTier, ResultBasis } from '../../core/models/models';
import { TierSelectorComponent } from '../../shared/components/tier-selector.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { GrowthAlertComponent } from '../../shared/components/widgets';
import { ProgressaoTableComponent } from './progressao-table.component';
import { ProgressaoChartComponent } from './progressao-chart.component';

const PRESETS = [1.5, 2, 3];

@Component({
  selector: 'app-progressao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TierSelectorComponent, DisclaimerComponent, GrowthAlertComponent, ProgressaoTableComponent, ProgressaoChartComponent],
  template: `
    <div class="page stack">
      <header class="page-head">
        <h1>Progressão</h1>
        <p>Evolução de jogos, investimento e prêmio simulado por rodada.</p>
      </header>

      <section class="card">
        <div class="fields cols-2">
          <div class="field">
            <span class="label">Fator de crescimento</span>
            <div class="chips">
              @for (p of presets; track p) {
                <button type="button" class="chip" [class.active]="!customMode() && p === prog().multiplier" (click)="setMultiplier(p)">
                  {{ p.toString().replace('.', ',') }}x
                </button>
              }
              <button type="button" class="chip" [class.active]="customMode()" (click)="customOpen.set(true)">Personalizado</button>
            </div>
            @if (customMode() || customOpen()) {
              <input type="number" min="1" max="10" step="0.1" inputmode="decimal" aria-label="Multiplicador personalizado"
                [value]="prog().multiplier" (change)="setMultiplier(+$any($event.target).value)" />
            }
            <span class="hint">Jogos da rodada = jogos iniciais × fator^(rodada − 1), arredondado para cima.</span>
          </div>
          <div class="fields cols-2">
            <div class="field">
              <label for="initialGames">Jogos iniciais</label>
              <input id="initialGames" type="number" min="1" max="10000" step="1" inputmode="numeric"
                [value]="prog().initialGames" (change)="setInt('initialGames', $any($event.target).value, 1, 10000)" />
            </div>
            <div class="field">
              <label for="rounds">Rodadas exibidas</label>
              <input id="rounds" type="number" min="1" [max]="maxRounds" step="1" inputmode="numeric"
                [value]="prog().rounds" (change)="setInt('rounds', $any($event.target).value, 1, maxRounds)" />
            </div>
            <div class="field">
              <label for="currentRound">Rodada atual</label>
              <select id="currentRound" [value]="prog().currentRound" (change)="state.goToRound(+$any($event.target).value)">
                @for (r of state.progressionRows(); track r.round) {
                  <option [value]="r.round" [selected]="r.round === prog().currentRound">Rodada {{ r.round }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="basis">Lucro/ROI sobre</label>
              <select id="basis" [value]="prog().resultBasis" (change)="setBasis($any($event.target).value)">
                <option value="accumulated" [selected]="prog().resultBasis === 'accumulated'">Investimento acumulado</option>
                <option value="round" [selected]="prog().resultBasis === 'round'">Investimento da rodada</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <app-growth-alert />

      <section class="card">
        <div class="card-head">
          <div>
            <h2>Tabela de progressão</h2>
            <p>Resultado e ROI calculados para a faixa selecionada · simulação proporcional configurada pelo usuário</p>
          </div>
          <app-tier-selector [compact]="true" [value]="tier()" (valueChange)="tier.set($event)" />
        </div>
        <app-progressao-table [rows]="state.progressionRows()" [tier]="tier()" [basis]="prog().resultBasis" [currentRound]="prog().currentRound" />
      </section>

      <app-progressao-chart [rows]="state.progressionRows()" />

      <app-disclaimer [full]="true" />
    </div>
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

  protected setMultiplier(value: number): void {
    if (!Number.isFinite(value) || value < 1) return;
    this.state.update('progression', { multiplier: Math.min(10, Math.round(value * 100) / 100) });
    if (PRESETS.includes(value)) this.customOpen.set(false);
  }

  protected setInt(key: 'initialGames' | 'rounds', raw: string, min: number, max: number): void {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return;
    const value = Math.min(max, Math.max(min, n));
    const patch: Record<string, number> = { [key]: value };
    if (key === 'rounds' && this.prog().currentRound > value) patch['currentRound'] = value;
    this.state.update('progression', patch);
  }

  protected setBasis(value: ResultBasis): void {
    this.state.update('progression', { resultBasis: value });
  }
}
