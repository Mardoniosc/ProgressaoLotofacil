import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { calculateScenario } from '../../core/services/lotofacil-calculation.service';
import { PRIZE_TIERS, PrizeTier, ProgressionRow, ResultBasis } from '../../core/models/models';
import { BrlPipe, NumPipe, PercentPipe } from '../../shared/pipes/format.pipes';

/** Tabela principal da progressão. */
@Component({
  selector: 'app-progressao-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, NumPipe, PercentPipe],
  template: `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Rodada</th>
            <th scope="col">Jogos</th>
            <th scope="col">Investimento</th>
            <th scope="col">Acumulado</th>
            @for (t of tiers; track t) {
              <th scope="col" [class.sel]="t === tier()">{{ state.tierLabel(t) }}</th>
            }
            <th scope="col">Resultado ({{ hits(tier()) }})</th>
            <th scope="col">ROI ({{ hits(tier()) }})</th>
          </tr>
        </thead>
        <tbody>
          @for (r of view(); track r.row.round) {
            <tr [class.current]="r.row.round === currentRound()">
              <td>{{ r.row.round }}{{ r.row.round === currentRound() ? ' ◂' : '' }}</td>
              <td>{{ r.row.games | num }}</td>
              <td>{{ r.row.investment | brl }}</td>
              <td>{{ r.row.accumulated | brl }}</td>
              @for (t of tiers; track t) {
                <td [class.sel]="t === tier()">{{ r.row.prizes[t] | brl }}</td>
              }
              <td [class]="'text-' + r.sc.kind">{{ r.sc.result | brl }}</td>
              <td [class]="'text-' + r.sc.kind">{{ r.sc.roi | pct }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .sel { background: color-mix(in srgb, var(--series-2) 8%, transparent); }
  `,
})
export class ProgressaoTableComponent {
  protected readonly state = inject(AppStateService);
  readonly rows = input.required<ProgressionRow[]>();
  readonly tier = input.required<PrizeTier>();
  readonly basis = input.required<ResultBasis>();
  readonly currentRound = input(1);

  protected readonly tiers = PRIZE_TIERS;
  protected readonly view = computed(() =>
    this.rows().map((row) => ({ row, sc: calculateScenario(row, this.tier(), this.basis()) })),
  );

  protected hits(t: PrizeTier): string {
    return t.replace('hit', '');
  }
}
