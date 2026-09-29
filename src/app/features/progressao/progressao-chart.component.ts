import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { PrizeTier, ProgressionRow } from '../../core/models/models';
import { ChartComponent, ChartSeries } from '../../shared/components/chart.component';
import { TierSelectorComponent } from '../../shared/components/tier-selector.component';

/** Os três gráficos da progressão. */
@Component({
  selector: 'app-progressao-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChartComponent, TierSelectorComponent],
  template: `
    <div class="two-col">
      <section class="card">
        <div class="card-head"><div><h2>Investimento por rodada</h2><p>Valor investido em cada rodada</p></div></div>
        <app-chart [labels]="labels()" [series]="investmentSeries()" ariaLabel="Investimento por rodada" />
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Investimento acumulado</h2><p>Exposição total ao longo das rodadas</p></div></div>
        <app-chart [labels]="labels()" [series]="accumulatedSeries()" ariaLabel="Investimento acumulado" />
      </section>
    </div>
    <section class="card" style="margin-top: 16px">
      <div class="card-head">
        <div><h2>Investimento × prêmio simulado</h2><p>{{ state.tierLabel(tier()) }} · {{ basisText() }}</p></div>
        <app-tier-selector [compact]="true" [value]="tier()" (valueChange)="localTier.set($event)" />
      </div>
      <app-chart [labels]="labels()" [series]="comparisonSeries()" ariaLabel="Investimento versus prêmio simulado" />
    </section>
  `,
})
export class ProgressaoChartComponent {
  protected readonly state = inject(AppStateService);
  readonly rows = input.required<ProgressionRow[]>();

  protected readonly localTier = signal<PrizeTier | null>(null);
  protected readonly tier = computed(() => this.localTier() ?? this.state.selectedTier());
  protected readonly labels = computed(() => this.rows().map((r) => String(r.round)));
  protected readonly basisText = computed(() =>
    this.state.progression().resultBasis === 'accumulated' ? 'comparado ao investimento acumulado' : 'comparado ao investimento da rodada',
  );

  protected readonly investmentSeries = computed<ChartSeries[]>(() => [
    { name: 'Investimento', values: this.rows().map((r) => r.investment), color: '--series-1', type: 'bar' },
  ]);
  protected readonly accumulatedSeries = computed<ChartSeries[]>(() => [
    { name: 'Acumulado', values: this.rows().map((r) => r.accumulated), color: '--series-1', type: 'line' },
  ]);
  protected readonly comparisonSeries = computed<ChartSeries[]>(() => {
    const accumulated = this.state.progression().resultBasis === 'accumulated';
    return [
      {
        name: accumulated ? 'Investimento acumulado' : 'Investimento',
        values: this.rows().map((r) => (accumulated ? r.accumulated : r.investment)),
        color: '--series-1',
        type: 'bar',
      },
      { name: 'Prêmio simulado', values: this.rows().map((r) => r.prizes[this.tier()]), color: '--series-2', type: 'bar' },
    ];
  });
}
