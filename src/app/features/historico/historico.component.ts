import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { calculateInvestment, calculateProfit, classifyResult } from '../../core/services/lotofacil-calculation.service';
import { Round } from '../../core/models/models';
import { todayISO } from '../../core/utils/format';
import { BrlPipe, DateBrPipe, JogosPipe, PercentPipe } from '../../shared/pipes/format.pipes';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { NumberChipsComponent } from '../../shared/components/widgets';
import { NumberGridComponent } from '../aposta/number-grid.component';

type Draft = Omit<Round, 'result'> & { isNew: boolean; advance: boolean; autoInvestment: boolean };

const KIND_LABEL = { lucro: 'LUCRO', prejuizo: 'PREJUÍZO', empate: 'EMPATE' } as const;

@Component({
  selector: 'app-historico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, DateBrPipe, JogosPipe, PercentPipe, MoneyInputComponent, DisclaimerComponent, NumberChipsComponent, NumberGridComponent],
  templateUrl: './historico.component.html',
  styles: `
    .round-card { display: grid; gap: 10px; }
    .round-top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .round-top h3 { font-size: 1rem; }
    .facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; font-size: .88rem; }
    @media (min-width: 720px) { .facts { grid-template-columns: repeat(4, 1fr); } }
    .facts span { color: var(--text-3); display: block; font-size: .75rem; }
    .facts strong { font-variant-numeric: tabular-nums; }
    .form-card { border: 2px solid var(--primary); }
    .result-preview { padding: 10px 12px; background: var(--surface-2); border-radius: var(--radius-sm); font-size: .9rem; }
    details.grid-toggle summary { cursor: pointer; font-weight: 600; font-size: .88rem; color: var(--primary); margin: 4px 0 12px; }
  `,
})
export class HistoricoComponent {
  protected readonly state = inject(AppStateService);
  private readonly router = inject(Router);

  /** ?novo=1 abre o formulário já preenchido com a rodada atual. */
  readonly novo = input<string>();

  protected readonly summary = this.state.historySummary;
  protected readonly rounds = computed(() => [...this.state.rounds()].reverse());
  protected readonly draft = signal<Draft | null>(null);
  protected readonly kindLabel = KIND_LABEL;

  protected readonly draftResult = computed(() => {
    const d = this.draft();
    if (!d) return null;
    const result = calculateProfit(d.prize ?? 0, d.investment);
    return { result, kind: classifyResult(result) };
  });

  constructor() {
    effect(() => {
      if (this.novo()) {
        untracked(() => this.openNew());
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
    });
  }

  protected openNew(): void {
    const cur = this.state.currentRow();
    const bet = this.state.bet();
    const nextNumber = Math.max(0, ...this.state.rounds().map((r) => r.roundNumber)) + 1;
    this.draft.set({
      id: '',
      date: todayISO(),
      roundNumber: nextNumber,
      games: cur.games,
      betValue: bet.betValue,
      investment: cur.investment,
      numbers: [...bet.selectedNumbers],
      hits: undefined,
      prize: undefined,
      notes: '',
      isNew: true,
      advance: true,
      autoInvestment: true,
    });
    queueMicrotask(() => document.getElementById('round-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  protected edit(round: Round): void {
    this.draft.set({
      ...round,
      numbers: [...round.numbers],
      isNew: false,
      advance: false,
      autoInvestment: calculateInvestment(round.games, round.betValue) === round.investment,
    });
    queueMicrotask(() => document.getElementById('round-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  protected patch(p: Partial<Draft>): void {
    this.draft.update((d) => {
      if (!d) return d;
      const next = { ...d, ...p };
      if (next.autoInvestment && ('games' in p || 'betValue' in p)) {
        next.investment = calculateInvestment(next.games, next.betValue);
      }
      return next;
    });
  }

  protected setInvestment(value: number): void {
    this.patch({ investment: value, autoInvestment: false });
  }

  protected intOrUndefined(raw: string): number | undefined {
    if (raw === '' || raw === null) return undefined;
    const n = Math.round(Number(raw));
    return Number.isFinite(n) ? n : undefined;
  }

  protected save(): void {
    const d = this.draft();
    if (!d) return;
    const { isNew, advance, autoInvestment, ...round } = d;
    void autoInvestment;
    this.state.saveRound({
      ...round,
      games: Math.max(1, Math.round(round.games)),
      notes: round.notes?.trim() || undefined,
    });
    if (isNew && advance) this.state.advanceRound();
    this.draft.set(null);
  }

  protected remove(round: Round): void {
    if (confirm(`Excluir a rodada ${round.roundNumber} do histórico?`)) this.state.deleteRound(round.id);
  }

  protected resultOf(round: Round) {
    const result = calculateProfit(round.prize ?? 0, round.investment);
    return { result, kind: classifyResult(result), roi: this.state.roundROI(round) };
  }

  protected readonly hitOptions = Array.from({ length: 16 }, (_, i) => i);
}
