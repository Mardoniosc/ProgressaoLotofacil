import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { PRIZE_TIERS, PrizeTier, TIER_HITS } from '../../core/models/models';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { IconComponent, LogoComponent } from '../../shared/components/icon.component';
import { NumPipe } from '../../shared/pipes/format.pipes';
import { NumberGridComponent } from '../aposta/number-grid.component';

const STEPS = 5;

/** Assistente exibido no primeiro acesso. Cada ilustração usa componentes reais do app. */
@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyInputComponent, NumberGridComponent, DisclaimerComponent, IconComponent, LogoComponent, NumPipe],
  template: `
    <div class="wizard">
      <div class="top">
        <app-logo [size]="32" />
        @if (step() < steps) {
          <button type="button" class="skip" (click)="step.set(steps)">Pular</button>
        }
      </div>

      <div class="content" [attr.data-step]="step()">
        <div class="card illo">
          @switch (step()) {
            @case (1) {
              <div class="row between"><span class="k">Jogos por rodada</span><span class="pri-tx x">×{{ state.progression().multiplier }}</span></div>
              <div class="mini-bars">
                @for (r of preview(); track r.round; let i = $index) {
                  <div class="mb" [class.cur]="i === 0">
                    <span>{{ r.games | num }}</span>
                    <i [style.height.px]="barH(r.games)"></i>
                    <small>R{{ r.round }}</small>
                  </div>
                }
              </div>
              <label class="k" for="ob-bet" style="margin-top: 14px">Valor por jogo</label>
              <app-money-input size="lg" inputId="ob-bet" [value]="state.bet().betValue" (valueChange)="state.setBetValue($event)" />
            }
            @case (2) {
              <app-number-grid [selected]="state.bet().selectedNumbers" (selectedChange)="state.setSelectedNumbers($event)" [max]="state.bet().numbersPerGame" />
            }
            @case (3) {
              <span class="k">Se eu acertar…</span>
              <div class="tiers">
                @for (t of tiers; track t) {
                  <div class="tier-row">
                    <label [for]="'ob-' + t"><b>{{ hits[t] }}</b> acertos</label>
                    <app-money-input [inputId]="'ob-' + t" [value]="state.prizes()[t]" (valueChange)="setPrize(t, $event)" />
                  </div>
                }
              </div>
            }
            @case (4) {
              <div class="field">
                <label for="ob-bank">Banca disponível</label>
                <app-money-input size="lg" inputId="ob-bank" [value]="state.bankroll().initialBankroll" (valueChange)="state.update('bankroll', { initialBankroll: $event })" />
              </div>
              <div class="field" style="margin-top: 14px">
                <label for="ob-limit">Limite máximo por rodada</label>
                <app-money-input inputId="ob-limit" [value]="state.bankroll().maxRoundInvestment ?? 0" (valueChange)="state.update('bankroll', { maxRoundInvestment: $event })" />
                <span class="hint">Você será avisado quando a próxima rodada ultrapassar esse valor.</span>
              </div>
            }
            @case (5) {
              <div class="done">
                <div class="d-icon"><app-icon name="shield-check" [size]="34" /></div>
                <h3>Armazenado neste dispositivo</h3>
                <div class="chips center">
                  <span class="badge ok-chip">✓ Sem login</span>
                  <span class="badge ok-chip">✓ Funciona offline</span>
                  <span class="badge ok-chip">✓ Exporte quando quiser</span>
                </div>
              </div>
            }
          }
        </div>

        <div class="text">
          <h1>{{ copy()[0] }}</h1>
          <p>{{ copy()[1] }}</p>
        </div>
        @if (step() === steps) { <app-disclaimer [full]="true" /> }
      </div>

      <div class="foot">
        <div class="dots" aria-hidden="true">
          @for (s of stepsArr; track s) { <span [class.on]="s === step()"></span> }
        </div>
        <div class="row">
          @if (step() > 1) {
            <button class="btn ghost" type="button" (click)="step.set(step() - 1)">Voltar</button>
          }
          @if (step() < steps) {
            <button class="btn" type="button" (click)="step.set(step() + 1)">Próximo <app-icon name="arrow-right" [size]="18" /></button>
          } @else {
            <button class="btn" type="button" (click)="finish()">Começar</button>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .wizard { min-height: 100dvh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; padding: 16px 20px calc(20px + env(safe-area-inset-bottom)); gap: 16px; }
    .top { display: flex; justify-content: space-between; align-items: center; min-height: 44px; }
    .skip { background: none; border: 0; font: inherit; font-size: 16px; font-weight: 700; color: var(--tx2); min-height: 44px; padding: 0 8px; cursor: pointer; }
    .content { flex: 1; display: flex; flex-direction: column; gap: 22px; animation: fade-up var(--t-enter) var(--ease); }
    .illo { padding: 20px; }
    .k { display: block; font-size: 13px; font-weight: 700; color: var(--tx2); margin-bottom: 8px; }
    .x { font-size: 13px; font-weight: 800; }
    .mini-bars { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; align-items: end; height: 150px; margin-top: 4px; }
    .mb { display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 6px; height: 100%; text-align: center; }
    .mb span { font-weight: 800; font-size: 15px; }
    .mb i { display: block; border-radius: 8px; background: var(--pri-soft); }
    .mb:nth-child(-n + 2) i { background: var(--pri); }
    .mb.cur i { background: var(--pri); }
    .mb small { font-size: 11px; font-weight: 700; color: var(--tx3); }
    .tiers { display: flex; flex-direction: column; gap: 8px; }
    .tier-row { display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 10px; }
    .tier-row label { font-size: 14px; color: var(--tx2); font-weight: 600; }
    .tier-row b { font-size: 18px; color: var(--tx); font-weight: 800; }
    .done { text-align: center; padding: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .d-icon { width: 80px; height: 80px; border-radius: var(--r-lg); background: var(--pri-soft); color: var(--pri); display: grid; place-items: center; }
    .center { justify-content: center; }
    .ok-chip { background: var(--sf2); color: var(--tx); text-transform: none; letter-spacing: 0; font-size: 12.5px; padding: 6px 12px; }
    .text h1 { font-size: 28px; line-height: 34px; }
    .text p { color: var(--tx2); font-size: 16px; line-height: 24px; margin-top: 6px; }
    .foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .dots { display: flex; gap: 6px; }
    .dots span { width: 8px; height: 8px; border-radius: 999px; background: var(--bd); transition: width var(--t-state) var(--ease), background var(--t-state); }
    .dots span.on { width: 24px; background: var(--pri); }
  `,
})
export class OnboardingComponent {
  protected readonly state = inject(AppStateService);
  private readonly router = inject(Router);

  protected readonly steps = STEPS;
  protected readonly stepsArr = Array.from({ length: STEPS }, (_, i) => i + 1);
  protected readonly tiers = PRIZE_TIERS;
  protected readonly hits = TIER_HITS;
  protected readonly step = signal(1);

  protected readonly copy = computed(() => {
    const n = this.state.bet().numbersPerGame;
    return [
      ['Qual o valor da sua aposta?', 'Todos os cálculos partem deste valor. Você pode alterá-lo depois.'],
      [`Informe seus ${n} números`, 'Toque nos números do volante. Você pode pular e fazer isso depois.'],
      ['Configure os valores das faixas', 'Valores iniciais editáveis — não são os valores oficiais vigentes.'],
      ['Qual sua banca disponível?', 'Usada para acompanhar quanto do seu orçamento já foi utilizado.'],
      ['Pronto!', 'Sua calculadora está configurada. Seus dados ficam apenas neste dispositivo.'],
    ][this.step() - 1];
  });

  protected readonly preview = computed(() => this.state.progressionRows().slice(0, 5));
  private readonly maxGames = computed(() => Math.max(1, ...this.preview().map((r) => r.games)));

  protected barH(games: number): number {
    return Math.max(10, (games / this.maxGames()) * 100);
  }

  protected setPrize(tier: PrizeTier, value: number): void {
    this.state.update('prizes', { [tier]: value });
  }

  protected finish(): void {
    this.state.completeOnboarding();
    this.router.navigate(['/dashboard']);
  }
}
