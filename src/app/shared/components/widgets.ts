import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { calculateScenario } from '../../core/services/lotofacil-calculation.service';
import { PrizeTier } from '../../core/models/models';
import { BrlPipe, JogosPipe, Pad2Pipe, PercentPipe } from '../pipes/format.pipes';
import { TierSelectorComponent } from './tier-selector.component';

/** Alerta sobre a próxima rodada da progressão. */
@Component({
  selector: 'app-growth-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, JogosPipe],
  template: `
    @let next = state.nextRow();
    <div class="alert" [class.warn]="state.nextRoundOverLimit() || state.nextRoundOverBankroll()" role="status">
      <div class="alert-title">{{ state.nextRoundOverLimit() || state.nextRoundOverBankroll() ? '⚠️' : 'ℹ️' }} Atenção à progressão</div>
      <p>
        Na próxima rodada (rodada {{ next.round }}) você precisará realizar <strong>{{ next.games | jogos }}</strong>,
        representando um investimento de <strong>{{ next.investment | brl }}</strong>
        (acumulado de {{ next.accumulated | brl }}).
      </p>
      @if (state.nextRoundOverLimit()) {
        <p class="strong">⚠️ O investimento da próxima rodada ultrapassou seu limite configurado ({{ state.bankroll().maxRoundInvestment | brl }} por rodada).</p>
      }
      @if (state.nextRoundOverBankroll()) {
        <p class="strong">⚠️ O acumulado da próxima rodada ultrapassa sua banca disponível ({{ state.bankroll().initialBankroll | brl }}).</p>
      }
    </div>
  `,
})
export class GrowthAlertComponent {
  protected readonly state = inject(AppStateService);
}

/** Barra de uso da banca. */
@Component({
  selector: 'app-bankroll-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, PercentPipe],
  template: `
    @let u = state.bankrollUsage();
    <div class="bank-head">
      <div>
        <div class="label">Banca restante</div>
        <div class="value" [class.neg]="u.remaining < 0">{{ u.remaining | brl }}</div>
      </div>
      <div class="right">
        <div class="label">Utilizado</div>
        <div class="value sm">{{ u.percentUsed | pct: false }}</div>
      </div>
    </div>
    <div class="meter" role="meter" aria-label="Percentual da banca utilizado" [attr.aria-valuenow]="u.percentUsed" aria-valuemin="0" aria-valuemax="100">
      <div class="meter-fill" [class.warn]="u.percentUsed >= 75" [class.over]="u.exceeded" [style.width.%]="u.percentUsed > 100 ? 100 : u.percentUsed"></div>
    </div>
    <div class="bank-foot">
      <span>{{ u.used | brl }} acumulado</span>
      <span>de {{ u.initial | brl }}</span>
    </div>
    @if (u.exceeded) {
      <p class="text-danger small">⚠️ O investimento acumulado ultrapassou a banca disponível.</p>
    }
  `,
  styles: `
    .bank-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
    .right { text-align: right; }
    .label { font-size: .78rem; color: var(--text-3); text-transform: uppercase; letter-spacing: .04em; }
    .value { font-size: 1.4rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .value.sm { font-size: 1.1rem; }
    .value.neg { color: var(--danger); }
    .bank-foot { display: flex; justify-content: space-between; font-size: .8rem; color: var(--text-3); margin-top: 6px; }
  `,
})
export class BankrollBarComponent {
  protected readonly state = inject(AppStateService);
}

/** Simulador "E se eu acertar...". */
@Component({
  selector: 'app-scenario-simulator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, PercentPipe, JogosPipe, TierSelectorComponent],
  template: `
    <app-tier-selector [compact]="true" [value]="tier()" (valueChange)="setTier($event)" label="E se eu acertar" />
    @let s = scenario();
    <p class="scenario-title">
      Cenário: <strong>{{ state.tierLabel(s.tier) }}</strong> na rodada {{ s.round }} ({{ s.games | jogos }})
    </p>
    <div class="scenario-grid">
      <div class="mini"><span>{{ basisLabel() }}</span><strong>{{ s.investment | brl }}</strong></div>
      <div class="mini"><span>Prêmio simulado</span><strong>{{ s.prize | brl }}</strong></div>
      <div class="mini"><span>Resultado</span><strong [class]="'text-' + s.kind">{{ s.result > 0 ? '+ ' : '' }}{{ s.result | brl }}</strong>
        <em class="tag" [class]="'tag-' + s.kind">{{ kindLabel[s.kind] }}</em></div>
      <div class="mini"><span>ROI</span><strong [class]="'text-' + s.kind">ROI {{ s.roi | pct }}</strong></div>
    </div>
  `,
  styles: `
    .scenario-title { margin: 12px 0 8px; color: var(--text-2); font-size: .9rem; }
    .scenario-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    @media (min-width: 720px) { .scenario-grid { grid-template-columns: repeat(4, 1fr); } }
    .mini { background: var(--surface-2); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
    .mini span { font-size: .75rem; color: var(--text-3); }
    .mini strong { font-size: 1.05rem; font-variant-numeric: tabular-nums; word-break: break-word; }
    .tag { font-style: normal; align-self: flex-start; }
  `,
})
export class ScenarioSimulatorComponent {
  protected readonly state = inject(AppStateService);
  /** Faixa local (não altera a faixa global do dashboard). */
  private readonly localTier = signal<PrizeTier | null>(null);
  protected readonly tier = computed(() => this.localTier() ?? this.state.selectedTier());
  protected readonly scenario = computed(() =>
    calculateScenario(this.state.currentRow(), this.tier(), this.state.progression().resultBasis),
  );
  protected readonly basisLabel = computed(() =>
    this.state.progression().resultBasis === 'accumulated' ? 'Investimento acumulado' : 'Investimento da rodada',
  );
  protected readonly kindLabel = { lucro: 'LUCRO', prejuizo: 'PREJUÍZO', empate: 'EMPATE' };

  protected setTier(t: PrizeTier): void {
    this.localTier.set(t);
  }
}

/** Lista "01 · 03 · 04 ..." dos números escolhidos. */
@Component({
  selector: 'app-number-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pad2Pipe],
  template: `
    @if (numbers().length) {
      <div class="balls">
        @for (n of numbers(); track n) {
          <span class="mini-ball">{{ n | pad2 }}</span>
        }
      </div>
    } @else {
      <p class="muted">Nenhum número selecionado.</p>
    }
  `,
  styles: `
    .balls { display: flex; flex-wrap: wrap; gap: 6px; }
    .mini-ball { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--primary); color: var(--on-primary); font-weight: 700; font-size: .85rem; font-variant-numeric: tabular-nums; }
  `,
})
export class NumberChipsComponent {
  readonly numbers = input<number[]>([]);
}
