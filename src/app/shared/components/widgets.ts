import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { BrlPipe, JogosPipe, NumPipe, Pad2Pipe, PercentPipe } from '../pipes/format.pipes';
import { AmountComponent } from './amount.component';
import { IconComponent } from './icon.component';
import { TierSelectorComponent } from './tier-selector.component';

/** Alerta sobre a próxima rodada da progressão. */
@Component({
  selector: 'app-growth-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, JogosPipe, IconComponent],
  template: `
    @let next = state.nextRow();
    @let tone = state.nextRoundOverBankroll() ? 'er' : state.nextRoundOverLimit() ? 'wn' : '';
    <div class="alert" [class]="tone" role="status">
      <app-icon class="a-icon" [name]="tone ? 'alert' : 'info'" [size]="20" />
      <div>
        <div class="a-title">Atenção à progressão</div>
        <p>
          Na próxima rodada você precisará realizar <b>{{ next.games | jogos }}</b>, representando um investimento de
          <b>{{ next.investment | brl }}</b> (acumulado de {{ next.accumulated | brl }}).
        </p>
        @if (state.nextRoundOverLimit()) {
          <p><b>O investimento da próxima rodada ultrapassou seu limite configurado</b> ({{ state.bankroll().maxRoundInvestment | brl }} por rodada).</p>
        }
        @if (state.nextRoundOverBankroll()) {
          <p><b>O acumulado da próxima rodada ultrapassa sua banca disponível</b> ({{ state.bankroll().initialBankroll | brl }}).</p>
        }
      </div>
    </div>
  `,
})
export class GrowthAlertComponent {
  protected readonly state = inject(AppStateService);
}

/** Card "Minha banca". */
@Component({
  selector: 'app-bankroll-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PercentPipe, AmountComponent],
  template: `
    @let u = state.bankrollUsage();
    <div class="bank" [class.wide]="wide()">
      <div class="b-main">
        <div class="row between">
          <span class="label">Minha banca</span>
          <span class="badge m-badge" [class]="status().cls">{{ status().text }}</span>
        </div>
        <div class="big"><app-amount [value]="u.initial" /></div>
      </div>
      <div class="b-side">
        <div class="row between usage">
          <span><b>{{ u.percentUsed | pct: false }}</b> utilizado</span>
          <span class="st" [class]="status().cls">{{ status().label }}</span>
        </div>
        <div class="progress" [class]="status().bar" role="meter" aria-label="Banca utilizada"
          [attr.aria-valuenow]="u.percentUsed" aria-valuemin="0" aria-valuemax="100">
          <span [style.width.%]="u.percentUsed > 100 ? 100 : u.percentUsed"></span>
        </div>
        <div class="minis">
          <div class="mini"><span class="k"><i class="dot used"></i>Utilizado</span><b><app-amount [value]="u.used" /></b></div>
          <div class="mini"><span class="k"><i class="dot"></i>Restante</span><b [class.neg]="u.remaining < 0"><app-amount [value]="u.remaining" /></b></div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .label { font-size: 13px; font-weight: 600; color: var(--tx2); }
    .big { font-size: 36px; line-height: 44px; margin: 6px 0 14px; }
    .usage { font-size: 13px; color: var(--tx2); margin: 10px 0 8px; order: 2; }
    .usage b { color: var(--tx); font-weight: 800; }
    .b-side { display: flex; flex-direction: column; }
    .b-side .progress { order: 1; }
    .b-side .usage { order: 2; }
    .b-side .minis { order: 3; }
    .st { font-size: 13px; font-weight: 700; display: none; }
    @media (min-width: 1024px) { .bank.wide .st { display: inline; } .bank.wide .m-badge { display: none; } }
    .st.ok { color: var(--ok); } .st.wn { color: var(--wn-tx); } .st.er { color: var(--er); }
    .minis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mini { background: var(--sf2); border-radius: var(--r-md); padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
    .mini .k { font-size: 12.5px; font-weight: 600; color: var(--tx2); display: flex; align-items: center; gap: 6px; }
    .mini b { font-size: 17px; font-weight: 800; }
    .mini b.neg :is(.amt) { color: var(--er); }
    .dot { width: 8px; height: 8px; border-radius: 2px; border: 1.5px solid var(--tx3); display: inline-block; }
    .dot.used { background: var(--pri); border-color: var(--pri); }
    @media (min-width: 1024px) {
      .bank.wide { display: grid; grid-template-columns: auto 1fr; gap: 32px; align-items: center; }
      .bank.wide .big { font-size: 44px; line-height: 48px; margin: 6px 0 0; }
      .bank.wide .b-side .usage { order: 0; margin: 0 0 10px; }
      .bank.wide .minis { display: flex; gap: 28px; margin-top: 12px; }
      .bank.wide .mini { background: none; padding: 0; flex-direction: row; align-items: baseline; gap: 8px; }
      .bank.wide .mini .dot { display: none; }
    }
  `,
})
export class BankrollCardComponent {
  protected readonly state = inject(AppStateService);
  /** Layout horizontal no desktop. */
  readonly wide = input(false);
  protected readonly status = computed(() => {
    const u = this.state.bankrollUsage();
    if (u.exceeded) return { cls: 'er', bar: 'er', text: '× Excedida', label: '× Limite excedido' };
    if (u.percentUsed >= 70) return { cls: 'wn', bar: 'wn', text: '⚠ Atenção', label: '⚠ Atenção · acima de 70%' };
    return { cls: 'ok', bar: '', text: 'Saudável', label: 'Saudável' };
  });
}

/** Card azul "Próxima rodada" com a linha de rodadas (toque em um ponto para ir até ela). */
@Component({
  selector: 'app-next-round-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, NumPipe, IconComponent],
  template: `
    @let next = state.nextRow();
    <div class="next">
      <div class="top">
        <span class="ov">Próxima rodada</span>
        <span class="pill">Rodada {{ next.round }}</span>
      </div>
      <div class="games">{{ next.games | num }} {{ next.games === 1 ? 'jogo' : 'jogos' }}</div>
      <div class="vals">
        <div><span>Investimento</span><b>{{ next.investment | brl }}</b></div>
        <div><span>Investimento acumulado</span><b>{{ next.accumulated | brl }}</b></div>
      </div>
      <div class="track" role="group" aria-label="Rodadas">
        @for (r of window(); track r.round) {
          <button type="button" class="step" [class.done]="r.round < current()" [class.cur]="r.round === current()"
            [attr.aria-label]="'Ir para a rodada ' + r.round" [attr.aria-current]="r.round === current() ? 'step' : null"
            (click)="state.goToRound(r.round)">
            <span class="g">{{ r.games | num }}</span>
            <span class="d"></span>
          </button>
        }
      </div>
      <div class="ctrl">
        <button type="button" (click)="state.previousRound()" [disabled]="current() <= 1" aria-label="Rodada anterior">
          <app-icon name="chevron-left" [size]="18" />
        </button>
        <span>Você está na rodada <b>{{ current() }}</b></span>
        <button type="button" (click)="state.advanceRound()" aria-label="Avançar rodada">
          <app-icon name="chevron-right" [size]="18" />
        </button>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .next { background: var(--pri); color: var(--on-pri); border-radius: var(--r-lg); padding: 18px 18px 14px; height: 100%;
      box-shadow: 0 12px 28px color-mix(in srgb, var(--pri) 30%, transparent); display: flex; flex-direction: column; }
    .top { display: flex; justify-content: space-between; align-items: center; }
    .ov { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .85; }
    .pill { font-size: 12.5px; font-weight: 800; border: 1.5px solid color-mix(in srgb, var(--on-pri) 70%, transparent); border-radius: 999px; padding: 3px 12px; }
    .games { font-size: 34px; line-height: 42px; font-weight: 800; letter-spacing: -.02em; margin: 4px 0 12px; }
    .vals { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .vals span { display: block; font-size: 12.5px; font-weight: 600; opacity: .85; }
    .vals b { font-size: 19px; font-weight: 800; }
    .track { display: flex; justify-content: space-between; position: relative; margin: 18px 4px 4px; }
    .track::before { content: ''; position: absolute; left: 10px; right: 10px; bottom: 9px; height: 2px; background: color-mix(in srgb, var(--on-pri) 45%, transparent); }
    .step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; background: none; border: 0; color: inherit; cursor: pointer; padding: 0; min-width: 32px; font: inherit; }
    .step .g { font-size: 12.5px; font-weight: 800; }
    .step .d { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--on-pri); background: var(--pri); margin: 3px 0; transition: transform var(--t-enter) var(--ease); }
    .step.done .d { background: var(--on-pri); }
    .step.cur .d { width: 20px; height: 20px; margin: -1px 0; background: var(--on-pri); box-shadow: 0 0 0 4px color-mix(in srgb, var(--on-pri) 30%, transparent); }
    .ctrl { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 10px; border-top: 1px solid color-mix(in srgb, var(--on-pri) 22%, transparent); font-size: 13px; }
    .ctrl button { width: 36px; height: 36px; border-radius: 10px; border: 0; background: color-mix(in srgb, var(--on-pri) 16%, transparent); color: inherit; display: grid; place-items: center; cursor: pointer; }
    .ctrl button:disabled { opacity: .4; cursor: not-allowed; }
  `,
})
export class NextRoundCardComponent {
  protected readonly state = inject(AppStateService);
  protected readonly current = computed(() => this.state.progression().currentRound);
  /** Até 5 rodadas ao redor da atual. */
  protected readonly window = computed(() => {
    const rows = this.state.progressionRows();
    const cur = this.current();
    const start = Math.max(0, Math.min(cur - 2, rows.length - 5));
    return rows.slice(start, start + 5);
  });
}

/** Simulador "Se eu acertar…" com cenário, resultado, ROI, ponto de equilíbrio e exposição. */
@Component({
  selector: 'app-scenario-simulator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, PercentPipe, AmountComponent, TierSelectorComponent],
  template: `
    @let s = state.currentScenario();
    <app-tier-selector [value]="state.selectedTier()" (valueChange)="state.setSelectedTier($event)" label="Se eu acertar" />
    <div class="box">
      <div class="row between">
        <span class="k">Cenário selecionado</span>
        <span class="badge sec">{{ state.tierLabel(s.tier) }}</span>
      </div>
      <div class="pair">
        <div><span class="k">Prêmio simulado</span><b>{{ s.prize | brl }}</b></div>
        <div><span class="k">{{ basisLabel() }}</span><b>{{ s.investment | brl }}</b></div>
      </div>
      <hr class="divider" />
      <div class="pair res">
        <div><span class="k">Resultado · {{ kind[s.kind] }}</span><b class="big"><app-amount [value]="s.result" [signed]="true" [arrow]="true" [colored]="true" /></b></div>
        <div class="roi"><span class="k">ROI</span><b [class.pos]="s.roi > 0" [class.neg]="s.roi < 0">{{ s.roi | pct }}</b></div>
      </div>
      <div class="pair extra">
        <div><span class="k">Ponto de equilíbrio</span><b>{{ state.breakEven().amount | brl }}</b></div>
        <div><span class="k">Exposição acumulada</span><b>{{ state.currentRow().accumulated | brl }}</b></div>
      </div>
    </div>
  `,
  styles: `
    .box { margin-top: 12px; background: var(--sf2); border-radius: var(--r-lg); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .k { display: block; font-size: 12.5px; font-weight: 600; color: var(--tx2); }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .pair b { font-size: 17px; font-weight: 800; }
    .big { font-size: 24px !important; line-height: 30px; }
    .roi { text-align: right; align-self: end; }
    .roi b { font-size: 19px; }
    .extra { padding-top: 12px; border-top: 1px dashed var(--bd); }
    .extra b { font-size: 15px; }
  `,
})
export class ScenarioSimulatorComponent {
  protected readonly state = inject(AppStateService);
  protected readonly basisLabel = computed(() =>
    this.state.progression().resultBasis === 'accumulated' ? 'Investimento acumulado' : 'Investimento da rodada',
  );
  protected readonly kind = { lucro: 'lucro', prejuizo: 'prejuízo', empate: 'empate' };
}

/** Lista "01 03 04 ..." dos números escolhidos. */
@Component({
  selector: 'app-number-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pad2Pipe],
  template: `
    @if (numbers().length) {
      <div class="balls">
        @for (n of numbers(); track n) { <span class="mini-ball">{{ n | pad2 }}</span> }
      </div>
    } @else {
      <p class="faint">Nenhum número selecionado.</p>
    }
  `,
})
export class NumberChipsComponent {
  readonly numbers = input<number[]>([]);
}
