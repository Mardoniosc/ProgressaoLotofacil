import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { calculateScenario } from '../../core/services/lotofacil-calculation.service';
import { PRIZE_TIERS, PrizeTier, ProgressionRow, ResultBasis } from '../../core/models/models';
import { formatBRL } from '../../core/utils/format';
import { NumPipe, PercentPipe } from '../../shared/pipes/format.pipes';

const brl = (v: number, compact = false) => formatBRL(v, compact && Math.abs(v) >= 10_000).replace(/,00$/, '');

/** Tabela principal da progressão. */
@Component({
  selector: 'app-progressao-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumPipe, PercentPipe],
  template: `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Rodada</th>
            <th scope="col">Jogos</th>
            <th scope="col">Invest.</th>
            <th scope="col">Acum.</th>
            @for (t of tiers; track t) {
              <th scope="col" [class.sel]="t === tier()" [title]="state.tierLabel(t)">{{ hits(t) }}</th>
            }
            <th scope="col">Resultado ({{ hits(tier()) }})</th>
            <th scope="col">ROI ({{ hits(tier()) }})</th>
          </tr>
        </thead>
        <tbody>
          @for (r of view(); track r.row.round) {
            <tr [class.current]="r.row.round === currentRound()" [class.done]="r.row.round < currentRound()">
              <td>
                @if (r.row.round < currentRound()) { <span class="ck">✓</span> }
                {{ r.row.round }}{{ r.row.round === currentRound() ? ' · atual' : '' }}
              </td>
              <td>{{ r.row.games | num }}</td>
              <td [class.warn-tx]="r.overLimit">{{ money(r.row.investment) }}{{ r.overLimit ? ' ↑' : '' }}</td>
              <td [class.neg]="r.overBank">{{ money(r.row.accumulated) }}{{ r.overBank ? ' ↑' : '' }}</td>
              @for (t of tiers; track t) {
                <td [class.sel]="t === tier()">{{ money(r.row.prizes[t], true) }}</td>
              }
              <td [class.pos]="r.sc.kind === 'lucro'" [class.neg]="r.sc.kind === 'prejuizo'">{{ r.sc.result > 0 ? '+ ' : '' }}{{ money(r.sc.result, true) }}</td>
              <td [class.pos]="r.sc.kind === 'lucro'" [class.neg]="r.sc.kind === 'prejuizo'">{{ r.sc.roi | pct }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p class="legend caption">
      <span class="warn-tx">↑ acima do limite por rodada</span> · <span class="neg">↑ acumulado acima da banca</span> ·
      simulação proporcional configurada pelo usuário
    </p>
  `,
  styles: `
    th.sel { color: var(--pri); }
    td.sel { background: color-mix(in srgb, var(--pri) 5%, var(--sf)); }
    tr.current td.sel { background: color-mix(in srgb, var(--pri) 14%, var(--sf)); }
    .ck { color: var(--ok); font-weight: 800; margin-right: 4px; }
    .legend { margin-top: 10px; }
  `,
})
export class ProgressaoTableComponent {
  protected readonly state = inject(AppStateService);
  readonly rows = input.required<ProgressionRow[]>();
  readonly tier = input.required<PrizeTier>();
  readonly basis = input.required<ResultBasis>();
  readonly currentRound = input(1);

  protected readonly tiers = PRIZE_TIERS;
  protected readonly view = computed(() => {
    const limit = this.state.bankroll().maxRoundInvestment ?? 0;
    const bank = this.state.bankroll().initialBankroll;
    return this.rows().map((row) => ({
      row,
      sc: calculateScenario(row, this.tier(), this.basis()),
      overLimit: limit > 0 && row.investment > limit,
      overBank: bank > 0 && row.accumulated > bank,
    }));
  });

  protected hits(t: PrizeTier): string {
    return t.replace('hit', '');
  }

  protected money(v: number, compact = false): string {
    return brl(v, compact);
  }
}
