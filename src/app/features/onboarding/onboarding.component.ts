import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { PRIZE_TIERS, PrizeTier } from '../../core/models/models';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { NumberGridComponent } from '../aposta/number-grid.component';

const STEPS = 5;

/** Assistente exibido no primeiro acesso. */
@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyInputComponent, NumberGridComponent, DisclaimerComponent],
  template: `
    <div class="wizard">
      <div class="card wizard-card">
        <div class="progress" aria-hidden="true">
          @for (s of stepsArr; track s) { <span [class.on]="s <= step()"></span> }
        </div>
        <p class="small muted">Passo {{ step() }} de {{ steps }}</p>

        @switch (step()) {
          @case (1) {
            <h1>Qual o valor atual da sua aposta?</h1>
            <p class="muted">Valor de um jogo. Todos os cálculos partem deste valor e ele pode ser alterado depois.</p>
            <div class="field"><app-money-input inputId="ob-bet" ariaLabel="Valor da aposta" [value]="state.bet().betValue" (valueChange)="state.setBetValue($event)" /></div>
          }
          @case (2) {
            <h1>Informe seus {{ state.bet().numbersPerGame }} números</h1>
            <p class="muted">Toque nos números do volante. Você pode pular e fazer isso depois.</p>
            <app-number-grid [selected]="state.bet().selectedNumbers" (selectedChange)="state.setSelectedNumbers($event)" [max]="state.bet().numbersPerGame" />
          }
          @case (3) {
            <h1>Configure os valores das faixas</h1>
            <p class="muted">Valores iniciais editáveis — não são os valores oficiais vigentes.</p>
            <div class="stack" style="gap: 10px">
              @for (t of tiers; track t) {
                <div class="field inline">
                  <label [for]="'ob-' + t">{{ state.tierLabel(t) }}</label>
                  <app-money-input [inputId]="'ob-' + t" [value]="state.prizes()[t]" (valueChange)="setPrize(t, $event)" />
                </div>
              }
            </div>
          }
          @case (4) {
            <h1>Qual sua banca disponível?</h1>
            <p class="muted">Usada para acompanhar quanto do seu orçamento já foi utilizado.</p>
            <div class="field"><app-money-input inputId="ob-bank" ariaLabel="Banca disponível" [value]="state.bankroll().initialBankroll" (valueChange)="state.update('bankroll', { initialBankroll: $event })" /></div>
            <div class="field" style="margin-top: 12px">
              <label for="ob-limit">Limite máximo por rodada</label>
              <app-money-input inputId="ob-limit" [value]="state.bankroll().maxRoundInvestment ?? 0" (valueChange)="state.update('bankroll', { maxRoundInvestment: $event })" />
            </div>
          }
          @case (5) {
            <div class="done">
              <div class="done-icon">✓</div>
              <h1>Pronto!</h1>
              <p>Sua calculadora está configurada.</p>
              <app-disclaimer [full]="true" />
            </div>
          }
        }

        <div class="row between actions">
          @if (step() > 1) {
            <button class="btn" type="button" (click)="step.set(step() - 1)">Voltar</button>
          } @else {
            <span></span>
          }
          @if (step() < steps) {
            <button class="btn primary" type="button" (click)="step.set(step() + 1)">{{ step() === 2 && !complete() ? 'Pular' : 'Continuar' }}</button>
          } @else {
            <button class="btn primary" type="button" (click)="finish()">Abrir Dashboard</button>
          }
        </div>
      </div>
      <p class="brand-note">Lotofácil Progressão · simulação matemática e acompanhamento de apostas</p>
    </div>
  `,
  styles: `
    .wizard { min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; gap: 12px;
      background: radial-gradient(circle at top, var(--primary-soft), transparent 60%), var(--bg); }
    .wizard-card { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 12px; padding: 24px 20px; }
    h1 { font-size: 1.3rem; }
    .progress { display: flex; gap: 6px; }
    .progress span { flex: 1; height: 5px; border-radius: 999px; background: var(--surface-2); transition: background .2s; }
    .progress span.on { background: var(--primary); }
    .actions { margin-top: 8px; }
    .inline { display: grid; grid-template-columns: 110px 1fr; align-items: center; }
    .done { text-align: center; }
    .done-icon { width: 64px; height: 64px; margin: 0 auto 12px; border-radius: 50%; background: var(--success-soft); color: var(--success); display: grid; place-items: center; font-size: 2rem; font-weight: 800; }
    .brand-note { font-size: .75rem; color: var(--text-3); text-align: center; }
  `,
})
export class OnboardingComponent {
  protected readonly state = inject(AppStateService);
  private readonly router = inject(Router);

  protected readonly steps = STEPS;
  protected readonly stepsArr = Array.from({ length: STEPS }, (_, i) => i + 1);
  protected readonly tiers = PRIZE_TIERS;
  protected readonly step = signal(1);
  protected readonly complete = computed(
    () => this.state.bet().selectedNumbers.length === this.state.bet().numbersPerGame,
  );

  protected setPrize(tier: PrizeTier, value: number): void {
    this.state.update('prizes', { [tier]: value });
  }

  protected finish(): void {
    this.state.completeOnboarding();
    this.router.navigate(['/dashboard']);
  }
}
