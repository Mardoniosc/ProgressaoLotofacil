import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { PRIZE_TIERS, PrizeMode, PrizeTier, TIER_HITS } from '../../core/models/models';
import { BrlPipe, JogosPipe } from '../../shared/pipes/format.pipes';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';

@Component({
  selector: 'app-premiacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, JogosPipe, MoneyInputComponent, DisclaimerComponent],
  template: `
    <div class="page stack">
      <header class="page-head">
        <h1>Premiações</h1>
        <p>Valores configuráveis por faixa. Não representam os valores oficiais vigentes dos concursos.</p>
      </header>

      <div class="alert">
        <div class="alert-title">Simulação proporcional configurada pelo usuário</div>
        <p>
          No modo <strong>proporcional</strong>, o prêmio simulado é o valor da faixa multiplicado pela quantidade de jogos
          da rodada. No modo <strong>fixo</strong>, o valor não muda com a quantidade de jogos. Isso não significa que a
          premiação oficial se comporte dessa forma.
        </p>
      </div>

      <section class="card">
        <div class="card-head">
          <h2>Faixas de premiação</h2>
          <button class="btn sm" type="button" (click)="restore()">Restaurar valores padrão</button>
        </div>
        <div class="tiers">
          @for (t of tiers; track t) {
            <div class="tier">
              <div class="tier-hits">{{ hits[t] }}</div>
              <div class="fields cols-3">
                <div class="field">
                  <label [for]="'label-' + t">Nome da faixa</label>
                  <input type="text" [id]="'label-' + t" maxlength="40" [value]="state.tierLabels()[t]"
                    (change)="setLabel(t, $any($event.target).value)" />
                </div>
                <div class="field">
                  <label [for]="'value-' + t">Valor base</label>
                  <app-money-input [inputId]="'value-' + t" [value]="state.prizes()[t]" (valueChange)="setPrize(t, $event)" />
                </div>
                <div class="field">
                  <label [for]="'mode-' + t">Comportamento</label>
                  <select [id]="'mode-' + t" (change)="setMode(t, $any($event.target).value)">
                    <option value="proportional" [selected]="state.prizeModes()[t] === 'proportional'">Proporcional aos jogos</option>
                    <option value="fixed" [selected]="state.prizeModes()[t] === 'fixed'">Valor fixo</option>
                  </select>
                </div>
              </div>
              <p class="small muted preview">
                Rodada atual ({{ state.currentRow().games | jogos }}): <strong>{{ state.currentRow().prizes[t] | brl }}</strong>
              </p>
            </div>
          }
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>Título do aplicativo</h2>
            <p>Ex.: "Minha estratégia" ou "Progressão Lotofácil"</p>
          </div>
          <button class="btn sm" type="button" (click)="state.restoreLabelDefaults()">Restaurar nomes</button>
        </div>
        <input type="text" maxlength="40" aria-label="Título do aplicativo" [value]="state.preferences().appTitle"
          (change)="setTitle($any($event.target).value)" />
      </section>

      <app-disclaimer />
    </div>
  `,
  styles: `
    .tiers { display: flex; flex-direction: column; gap: 14px; }
    .tier { display: grid; grid-template-columns: 44px 1fr; gap: 4px 12px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
    .tier:last-child { border-bottom: 0; padding-bottom: 0; }
    .tier-hits { width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: var(--on-primary); display: grid; place-items: center; font-weight: 800; margin-top: 24px; }
    .preview { grid-column: 2; margin: 0; }
  `,
})
export class PremiacaoComponent {
  protected readonly state = inject(AppStateService);
  protected readonly tiers = PRIZE_TIERS;
  protected readonly hits = TIER_HITS;

  protected setPrize(tier: PrizeTier, value: number): void {
    this.state.update('prizes', { [tier]: value });
  }

  protected setMode(tier: PrizeTier, mode: PrizeMode): void {
    this.state.update('prizeModes', { [tier]: mode });
  }

  protected setLabel(tier: PrizeTier, value: string): void {
    this.state.update('tierLabels', { [tier]: value.trim() || `${TIER_HITS[tier]} acertos` });
  }

  protected setTitle(value: string): void {
    this.state.update('preferences', { appTitle: value.trim() || 'Lotofácil Progressão' });
  }

  protected restore(): void {
    if (confirm('Restaurar os valores e comportamentos padrão das faixas?')) this.state.restorePrizeDefaults();
  }
}
