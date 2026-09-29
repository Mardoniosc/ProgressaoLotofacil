import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { PRIZE_TIERS, PrizeTier, TIER_HITS } from '../../core/models/models';

/** Seletor de faixa (11 a 15 acertos) em formato de chips. */
@Component({
  selector: 'app-tier-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chips" role="radiogroup" [attr.aria-label]="label()">
      @for (t of tiers; track t) {
        <button type="button" class="chip" role="radio" [attr.aria-checked]="value() === t" [class.active]="value() === t"
          [title]="state.tierLabel(t)" (click)="value.set(t)">
          {{ compact() ? hits[t] : state.tierLabel(t) }}
        </button>
      }
    </div>
  `,
})
export class TierSelectorComponent {
  protected readonly state = inject(AppStateService);
  readonly value = model<PrizeTier>('hit14');
  readonly compact = input(false);
  readonly label = input('Faixa de premiação');
  protected readonly tiers = PRIZE_TIERS;
  protected readonly hits = TIER_HITS;
}
