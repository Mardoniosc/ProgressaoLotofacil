import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { PRIZE_TIERS, PrizeTier, TIER_HITS } from '../../core/models/models';
import { formatBRL } from '../../core/utils/format';

/** Seletor de faixa (11 a 15 acertos): blocos com o número e o prêmio simulado. */
@Component({
  selector: 'app-tier-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tier-chips" [class.compact]="!showPrize()" role="radiogroup" [attr.aria-label]="label()">
      @for (t of tiers; track t) {
        <button type="button" class="tier-chip" role="radio" [attr.aria-checked]="value() === t" [class.active]="value() === t"
          [title]="state.tierLabel(t)" (click)="value.set(t)">
          <span class="n">{{ hits[t] }}</span>
          @if (showPrize()) { <span class="p">{{ prize(t) }}</span> }
        </button>
      }
    </div>
  `,
  styles: `
    .compact .tier-chip { min-height: 40px; }
    .compact .tier-chip .n { font-size: 15px; }
    .compact { display: inline-grid; grid-template-columns: repeat(5, 44px); }
  `,
})
export class TierSelectorComponent {
  protected readonly state = inject(AppStateService);
  readonly value = model<PrizeTier>('hit14');
  /** Mostra o prêmio simulado da rodada atual abaixo do número. */
  readonly showPrize = input(true);
  readonly label = input('Faixa de premiação');
  protected readonly tiers = PRIZE_TIERS;
  protected readonly hits = TIER_HITS;

  protected prize(t: PrizeTier): string {
    return formatBRL(this.state.currentRow().prizes[t], true).replace(/,00$/, '');
  }
}
