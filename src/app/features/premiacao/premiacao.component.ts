import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { UiService } from '../../core/services/ui.service';
import { PRIZE_TIERS, PrizeMode, PrizeTier, TIER_HITS } from '../../core/models/models';
import { BrlPipe, JogosPipe } from '../../shared/pipes/format.pipes';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { IconComponent } from '../../shared/components/icon.component';
import { AmountComponent } from '../../shared/components/amount.component';
import { SheetComponent } from '../../shared/components/sheet.component';

interface PrizeDraft {
  tier: PrizeTier;
  value: number;
  label: string;
  mode: PrizeMode;
}

@Component({
  selector: 'app-premiacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BrlPipe, JogosPipe, MoneyInputComponent, DisclaimerComponent, IconComponent, AmountComponent, SheetComponent],
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <a class="back-link" routerLink="/dashboard"><app-icon name="chevron-left" [size]="20" /> Dashboard</a>
          <h1>Faixas de premiação</h1>
          <p class="sub">Toque em uma faixa para editar o valor.</p>
        </div>
        <button class="btn outline sm" type="button" (click)="restore()"><app-icon name="refresh" [size]="18" /> Restaurar valores padrão</button>
      </header>

      <div class="layout">
        <div class="tiers">
          @for (t of tiers; track t) {
            @let selected = state.selectedTier() === t;
            <button type="button" class="tier" [class.selected]="selected" [class.max]="t === 'hit15'" (click)="open(t)">
              <span class="t-icon"><app-icon name="trophy" [size]="20" /></span>
              <span class="t-body">
                <span class="t-label">{{ state.tierLabel(t) }}{{ selected ? ' · selecionada' : t === 'hit15' ? ' · prêmio máximo' : '' }}</span>
                <span class="t-value"><app-amount [value]="state.prizes()[t]" /></span>
                <span class="t-meta">
                  {{ state.prizeModes()[t] === 'proportional' ? 'Proporcional' : 'Fixo' }} ·
                  {{ state.currentRow().games | jogos }}: <b>{{ state.currentRow().prizes[t] | brl }}</b>
                </span>
              </span>
              <span class="icon-btn soft sm" aria-hidden="true"><app-icon name="pencil" [size]="17" /></span>
            </button>
          }
        </div>

        <div class="stack">
          <div class="alert">
            <app-icon class="a-icon" name="info" [size]="20" />
            <div>
              <div class="a-title">Valores configuráveis</div>
              <p>Os valores apresentados são parâmetros definidos pelo usuário e podem ser alterados conforme o concurso ou cenário analisado. Não são os valores oficiais vigentes.</p>
            </div>
          </div>
          <div class="alert" style="background: var(--sec-soft)">
            <app-icon class="a-icon" name="trend" [size]="20" style="color: var(--sec)" />
            <div>
              <div class="a-title" style="color: var(--sec)">Simulação proporcional configurada pelo usuário</div>
              <p>No modo <b>proporcional</b>, o prêmio simulado é o valor da faixa × a quantidade de jogos da rodada. No modo <b>fixo</b>, o valor não muda. Isso não significa que a premiação oficial se comporte dessa forma.</p>
            </div>
          </div>
        </div>
      </div>

      <app-disclaimer />
    </div>

    <app-sheet heading="Editar prêmio" [open]="!!draft()" (closed)="draft.set(null)">
      @if (draft(); as d) {
        <div class="field">
          <label for="p-tier">Faixa</label>
          <select id="p-tier" (change)="switchTier($any($event.target).value)">
            @for (t of tiers; track t) { <option [value]="t" [selected]="t === d.tier">{{ hits[t] }} acertos</option> }
          </select>
        </div>
        <div class="field">
          <label for="p-value">Valor do prêmio</label>
          <app-money-input inputId="p-value" [value]="d.value" (valueChange)="patch({ value: $event })" />
        </div>
        <div class="field">
          <label for="p-label">Nome exibido (opcional)</label>
          <input id="p-label" type="text" maxlength="40" [placeholder]="hits[d.tier] + ' acertos'" [value]="d.label"
            (input)="patch({ label: $any($event.target).value })" />
        </div>
        <div class="field">
          <span class="label">Comportamento</span>
          <div class="segmented block">
            <button type="button" [class.active]="d.mode === 'proportional'" (click)="patch({ mode: 'proportional' })">Proporcional aos jogos</button>
            <button type="button" [class.active]="d.mode === 'fixed'" (click)="patch({ mode: 'fixed' })">Valor fixo</button>
          </div>
        </div>
        <div class="btn-row">
          <button type="button" class="btn outline" (click)="draft.set(null)">Cancelar</button>
          <button type="button" class="btn" (click)="save()">Salvar prêmio</button>
        </div>
      }
    </app-sheet>
  `,
  styles: `
    .layout { display: grid; gap: 16px; align-items: start; }
    @media (min-width: 1024px) { .layout { grid-template-columns: 1.3fr 1fr; gap: 24px; } }
    .tiers { display: flex; flex-direction: column; gap: 10px; }
    .tier { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 14px; width: 100%; text-align: left; font: inherit; color: var(--tx);
      background: var(--sf); border: 1px solid var(--bd); border-radius: var(--r-lg); box-shadow: var(--sh-card); padding: 14px 14px 14px 16px; cursor: pointer;
      transition: border-color var(--t-state) var(--ease), box-shadow var(--t-state) var(--ease), transform var(--t-tap) var(--ease); }
    .tier:hover { border-color: color-mix(in srgb, var(--pri) 40%, var(--bd)); }
    .tier:active { transform: scale(.99); }
    .tier.selected { border: 1.5px solid var(--pri); box-shadow: var(--ring); }
    .t-icon { width: 44px; height: 44px; border-radius: var(--r-md); display: grid; place-items: center; background: var(--sf2); color: var(--tx2); }
    .tier.selected .t-icon { background: var(--pri); color: var(--on-pri); }
    .tier.max .t-icon { background: var(--sec-soft); color: var(--sec); }
    .t-body { display: flex; flex-direction: column; min-width: 0; }
    .t-label { font-size: 13px; font-weight: 600; color: var(--tx2); }
    .tier.selected .t-label { color: var(--pri); font-weight: 700; }
    .tier.max .t-label { color: var(--sec); font-weight: 700; }
    .t-value { font-size: 22px; line-height: 30px; }
    .tier.max .t-value { font-size: 28px; line-height: 34px; }
    .t-meta { font-size: 12px; color: var(--tx3); font-weight: 600; }
    .t-meta b { color: var(--tx2); }
  `,
})
export class PremiacaoComponent {
  protected readonly state = inject(AppStateService);
  private readonly ui = inject(UiService);
  protected readonly tiers = PRIZE_TIERS;
  protected readonly hits = TIER_HITS;
  protected readonly draft = signal<PrizeDraft | null>(null);

  private draftFor(tier: PrizeTier): PrizeDraft {
    const label = this.state.tierLabels()[tier];
    return {
      tier,
      value: this.state.prizes()[tier],
      label: label === `${TIER_HITS[tier]} acertos` ? '' : label,
      mode: this.state.prizeModes()[tier],
    };
  }

  /** Seleciona a faixa e abre a edição. */
  protected open(tier: PrizeTier): void {
    this.state.setSelectedTier(tier);
    this.draft.set(this.draftFor(tier));
  }

  protected switchTier(tier: PrizeTier): void {
    this.draft.set(this.draftFor(tier));
  }

  protected patch(p: Partial<PrizeDraft>): void {
    this.draft.update((d) => (d ? { ...d, ...p } : d));
  }

  protected save(): void {
    const d = this.draft();
    if (!d) return;
    this.state.update('prizes', { [d.tier]: d.value });
    this.state.update('prizeModes', { [d.tier]: d.mode });
    this.state.update('tierLabels', { [d.tier]: d.label.trim() || `${TIER_HITS[d.tier]} acertos` });
    this.draft.set(null);
  }

  protected async restore(): Promise<void> {
    const ok = await this.ui.confirm({
      title: 'Restaurar valores padrão?',
      message: 'Os valores e o comportamento das cinco faixas voltam para a configuração inicial. Os nomes personalizados são mantidos.',
      confirmText: 'Restaurar',
      tone: 'dark',
      icon: 'refresh',
    });
    if (ok) this.state.restorePrizeDefaults();
  }
}
