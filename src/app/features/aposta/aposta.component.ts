import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { MAX_NUMBERS_PER_GAME, MIN_NUMBERS_PER_GAME } from '../../core/models/defaults';
import { BrlPipe, JogosPipe } from '../../shared/pipes/format.pipes';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { NumberGridComponent } from './number-grid.component';

@Component({
  selector: 'app-aposta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, JogosPipe,MoneyInputComponent, NumberGridComponent, DisclaimerComponent],
  template: `
    <div class="page stack">
      <header class="page-head">
        <h1>Minha Aposta</h1>
        <p>Valor da aposta e números do jogo atual. Todos os cálculos partem destes dados.</p>
      </header>

      <section class="card">
        <div class="fields cols-2">
          <div class="field">
            <label for="betValue">Valor da aposta (por jogo)</label>
            <app-money-input inputId="betValue" [value]="state.bet().betValue" (valueChange)="state.setBetValue($event)" />
            <span class="hint">
              Rodada {{ cur().round }}: {{ cur().games | jogos }} × {{ state.bet().betValue | brl }} =
              <strong>{{ cur().investment | brl }}</strong>
            </span>
          </div>
          <div class="field">
            <label for="npg">Números por jogo</label>
            <select id="npg" [value]="state.bet().numbersPerGame" (change)="setNumbersPerGame($any($event.target).value)">
              @for (n of numbersPerGameOptions; track n) {
                <option [value]="n" [selected]="n === state.bet().numbersPerGame">{{ n }} números{{ n === 15 ? ' (padrão)' : '' }}</option>
              }
            </select>
            <span class="hint">Apostas com mais números têm valor maior — ajuste o valor da aposta de acordo.</span>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>Minha aposta atual</h2>
            <p>Toque nos números para selecionar ou remover.</p>
          </div>
          @if (dirty()) { <span class="badge" style="background: var(--warning-soft); color: var(--warning)">Não salvo</span> }
        </div>

        <app-number-grid [(selected)]="draft" [max]="state.bet().numbersPerGame" />

        <div class="selected-list" aria-live="polite">
          <span class="label">Números selecionados</span>
          <p class="nums">{{ formatted() || '—' }}</p>
        </div>

        <div class="row end">
          <button class="btn" type="button" (click)="clear()" [disabled]="!draft().length">Limpar aposta</button>
          <button class="btn primary" type="button" (click)="save()" [disabled]="!dirty()">Salvar aposta</button>
        </div>
        @if (savedMsg()) { <p class="small text-lucro" role="status" style="text-align: right; margin-top: 8px">{{ savedMsg() }}</p> }
      </section>

      <app-disclaimer />
    </div>
  `,
  styles: `
    .selected-list { margin: 18px 0 14px; padding: 12px; border-radius: var(--radius-sm); background: var(--surface-2); text-align: center; }
    .label { font-size: .75rem; color: var(--text-3); text-transform: uppercase; letter-spacing: .04em; font-weight: 600; }
    .nums { margin: 4px 0 0; font-weight: 700; font-size: 1.02rem; font-variant-numeric: tabular-nums; word-spacing: 2px; }
  `,
})
export class ApostaComponent {
  protected readonly state = inject(AppStateService);
  protected readonly cur = this.state.currentRow;
  protected readonly numbersPerGameOptions = Array.from(
    { length: MAX_NUMBERS_PER_GAME - MIN_NUMBERS_PER_GAME + 1 },
    (_, i) => i + MIN_NUMBERS_PER_GAME,
  );

  protected readonly draft = signal<number[]>([...this.state.bet().selectedNumbers]);
  protected readonly savedMsg = signal('');
  protected readonly dirty = computed(
    () => this.draft().join(',') !== this.state.bet().selectedNumbers.join(','),
  );
  protected readonly formatted = computed(() =>
    this.draft().map((n) => n.toString().padStart(2, '0')).join(' · '),
  );

  protected setNumbersPerGame(value: string): void {
    const n = Number(value);
    this.state.update('bet', { numbersPerGame: n });
    if (this.draft().length > n) this.draft.set(this.draft().slice(0, n));
  }

  protected clear(): void {
    this.draft.set([]);
    this.savedMsg.set('');
  }

  protected save(): void {
    this.state.setSelectedNumbers(this.draft());
    const complete = this.draft().length === this.state.bet().numbersPerGame;
    this.savedMsg.set(complete ? 'Aposta salva.' : 'Aposta salva (incompleta).');
  }
}
