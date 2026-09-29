import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { MAX_NUMBERS_PER_GAME, MIN_NUMBERS_PER_GAME } from '../../core/models/defaults';
import { BrlPipe, JogosPipe } from '../../shared/pipes/format.pipes';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { IconComponent } from '../../shared/components/icon.component';
import { NumberGridComponent } from './number-grid.component';

const PRESETS = [2.5, 3, 3.5];
const STEP = 0.5;

@Component({
  selector: 'app-aposta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, JogosPipe, MoneyInputComponent, NumberGridComponent, DisclaimerComponent, IconComponent],
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <h1>Minha aposta</h1>
          <p class="sub">Configure o jogo que deseja acompanhar.</p>
        </div>
      </header>

      <div class="layout">
        <section class="card">
          <label class="k" for="betValue">Valor atual</label>
          <div class="big-stepper">
            <button type="button" aria-label="Diminuir R$ 0,50" (click)="step(-1)"><app-icon name="minus" [size]="20" /></button>
            <app-money-input size="lg" inputId="betValue" [value]="state.bet().betValue" (valueChange)="state.setBetValue($event)" />
            <button type="button" aria-label="Aumentar R$ 0,50" (click)="step(1)"><app-icon name="plus" [size]="20" /></button>
          </div>
          <div class="chips">
            @for (p of presets; track p) {
              <button type="button" class="chip" [class.active]="state.bet().betValue === p" (click)="state.setBetValue(p)">
                @if (state.bet().betValue === p) { <app-icon name="check" [size]="16" [stroke]="2.6" /> }
                {{ p | brl }}
              </button>
            }
          </div>
          <p class="caption hint">
            Rodada {{ cur().round }}: {{ cur().games | jogos }} × {{ state.bet().betValue | brl }} =
            <b class="strong">{{ cur().investment | brl }}</b>
          </p>
          <hr class="divider" />
          <div class="field">
            <label for="npg">Números por jogo</label>
            <select id="npg" (change)="setNumbersPerGame($any($event.target).value)">
              @for (n of numbersPerGameOptions; track n) {
                <option [value]="n" [selected]="n === state.bet().numbersPerGame">{{ n }} números{{ n === 15 ? ' (padrão)' : '' }}</option>
              }
            </select>
            <span class="hint">Apostas com mais números têm valor maior — ajuste o valor da aposta de acordo.</span>
          </div>
        </section>

        <section class="card">
          <app-number-grid [(selected)]="draft" [max]="state.bet().numbersPerGame" />

          @if (limitReached()) {
            <div class="alert" style="margin-top: 16px">
              <app-icon class="a-icon" name="info" [size]="20" />
              <p style="margin: 0">Limite atingido. Desmarque um número para trocar.</p>
            </div>
          }
          @if (dirty()) {
            <div class="alert wn" style="margin-top: 12px">
              <app-icon class="a-icon" name="alert" [size]="20" />
              <p style="margin: 0">Alterações ainda não salvas.</p>
            </div>
          }
          @if (savedMsg() && !dirty()) {
            <div class="alert ok" style="margin-top: 12px" role="status">
              <app-icon class="a-icon" name="check-circle" [size]="20" />
              <p style="margin: 0">{{ savedMsg() }}</p>
            </div>
          }

          <div class="btn-row" style="margin-top: 16px">
            <button class="btn outline" type="button" (click)="clear()" [disabled]="!draft().length">Limpar</button>
            <button class="btn" type="button" (click)="save()" [disabled]="!dirty()">Salvar aposta</button>
          </div>
        </section>
      </div>

      <app-disclaimer />
    </div>
  `,
  styles: `
    .layout { display: grid; gap: 16px; align-items: start; }
    @media (min-width: 1024px) { .layout { grid-template-columns: 1fr 1.2fr; gap: 24px; } }
    .k { display: block; font-size: 13px; font-weight: 600; color: var(--tx2); margin-bottom: 8px; }
    .big-stepper { display: grid; grid-template-columns: 56px 1fr 56px; align-items: stretch; border: 1.5px solid var(--pri);
      border-radius: var(--r-md); box-shadow: var(--ring); overflow: hidden; margin-bottom: 12px; background: var(--sf); }
    .big-stepper button { border: 0; background: transparent; color: var(--tx2); cursor: pointer; display: grid; place-items: center; }
    .big-stepper button:hover { background: var(--sf2); color: var(--pri); }
    .big-stepper app-money-input { border-left: 1px solid var(--bd); border-right: 1px solid var(--bd); }
    .big-stepper ::ng-deep .money { border: 0 !important; box-shadow: none !important; border-radius: 0; }
    .hint { margin-top: 12px; }
  `,
})
export class ApostaComponent {
  protected readonly state = inject(AppStateService);
  protected readonly cur = this.state.currentRow;
  protected readonly presets = PRESETS;
  protected readonly numbersPerGameOptions = Array.from(
    { length: MAX_NUMBERS_PER_GAME - MIN_NUMBERS_PER_GAME + 1 },
    (_, i) => i + MIN_NUMBERS_PER_GAME,
  );

  protected readonly draft = signal<number[]>([...this.state.bet().selectedNumbers]);
  protected readonly savedMsg = signal('');
  protected readonly dirty = computed(
    () => this.draft().join(',') !== this.state.bet().selectedNumbers.join(','),
  );
  protected readonly limitReached = computed(() => this.draft().length >= this.state.bet().numbersPerGame);

  protected step(dir: 1 | -1): void {
    this.state.setBetValue(Math.max(0, Math.round((this.state.bet().betValue + dir * STEP) * 100) / 100));
  }

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
