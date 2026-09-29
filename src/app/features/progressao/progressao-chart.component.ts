import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { PrizeTier, ProgressionRow, TIER_HITS } from '../../core/models/models';
import { ChartComponent, ChartSeries } from '../../shared/components/chart.component';
import { AmountComponent } from '../../shared/components/amount.component';
import { TierSelectorComponent } from '../../shared/components/tier-selector.component';

/** Os três gráficos da progressão. */
@Component({
  selector: 'app-progressao-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartComponent, AmountComponent, TierSelectorComponent],
  template: `
    <div class="grid-2">
      <section class="card">
        <div class="card-head"><h3>Investimento por rodada</h3><span class="meta">barras</span></div>
        <app-chart [labels]="labels()" [series]="investmentSeries()" [highlight]="highlight()" ariaLabel="Investimento por rodada" />
      </section>
      <section class="card">
        <div class="card-head">
          <h3>Investimento acumulado</h3>
          <span class="total"><app-amount [value]="total()" /> <small>em {{ rows().length }} rodadas</small></span>
        </div>
        <app-chart [labels]="labels()" [series]="accumulatedSeries()" [highlight]="highlight()" ariaLabel="Investimento acumulado" />
      </section>
    </div>
    <section class="card" style="margin-top: var(--gap, 16px)">
      <div class="card-head">
        <h3>Investimento × prêmio</h3>
        <app-tier-selector [showPrize]="false" [value]="tier()" (valueChange)="localTier.set($event)" />
      </div>
      <app-chart [labels]="labels()" [series]="comparisonSeries()" [highlight]="highlight()" [chartHeight]="240"
        ariaLabel="Investimento versus prêmio simulado" />
      <p class="caption note">Área vermelha: zona onde o {{ basisWord() }} ultrapassa o prêmio simulado da faixa selecionada ({{ state.tierLabel(tier()) }}).</p>
    </section>
  `,
  styles: `
    .total { font-size: 20px; }
    .total small { font-size: 12px; color: var(--tx2); font-weight: 600; }
    .note { margin-top: 10px; font-weight: 500; color: var(--tx2); }
    @media (min-width: 1024px) { :host { --gap: 24px; } }
  `,
})
export class ProgressaoChartComponent {
  protected readonly state = inject(AppStateService);
  readonly rows = input.required<ProgressionRow[]>();

  protected readonly localTier = signal<PrizeTier | null>(null);
  protected readonly tier = computed(() => this.localTier() ?? this.state.selectedTier());
  protected readonly labels = computed(() => this.rows().map((r) => `R${r.round}`));
  protected readonly highlight = computed(() => this.state.progression().currentRound - 1);
  protected readonly total = computed(() => this.rows().at(-1)?.accumulated ?? 0);
  private readonly accumulated = computed(() => this.state.progression().resultBasis === 'accumulated');
  protected readonly basisWord = computed(() => (this.accumulated() ? 'acumulado' : 'investimento da rodada'));

  protected readonly investmentSeries = computed<ChartSeries[]>(() => [
    { name: 'Investimento', values: this.rows().map((r) => r.investment), color: '--pri', type: 'bar' },
  ]);
  protected readonly accumulatedSeries = computed<ChartSeries[]>(() => [
    { name: 'Acumulado', values: this.rows().map((r) => r.accumulated), color: '--pri', type: 'area' },
  ]);
  protected readonly comparisonSeries = computed<ChartSeries[]>(() => [
    {
      name: this.accumulated() ? 'Acumulado' : 'Investimento',
      values: this.rows().map((r) => (this.accumulated() ? r.accumulated : r.investment)),
      color: '--pri',
      type: 'area',
    },
    { name: `Prêmio ${TIER_HITS[this.tier()]}`, values: this.rows().map((r) => r.prizes[this.tier()]), color: '--sec', type: 'dashed' },
  ]);
}
