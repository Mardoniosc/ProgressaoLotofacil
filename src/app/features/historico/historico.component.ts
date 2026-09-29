import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { UiService } from '../../core/services/ui.service';
import { calculateInvestment, calculateProfit, classifyResult, ResultKind } from '../../core/services/lotofacil-calculation.service';
import { Round } from '../../core/models/models';
import { formatBRL, todayISO } from '../../core/utils/format';
import { BrlPipe, NumPipe, PercentPipe } from '../../shared/pipes/format.pipes';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { IconComponent } from '../../shared/components/icon.component';
import { AmountComponent } from '../../shared/components/amount.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import { NumberChipsComponent } from '../../shared/components/widgets';
import { NumberGridComponent } from '../aposta/number-grid.component';

type Draft = Omit<Round, 'result'> & { isNew: boolean; advance: boolean; autoInvestment: boolean };
type Filter = 'all' | 'lucro' | 'prejuizo';

const KIND_LABEL: Record<ResultKind, string> = { lucro: '↑ Lucro', prejuizo: '↓ Prejuízo', empate: 'Empate' };
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

@Component({
  selector: 'app-historico',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BrlPipe,
    NumPipe,
    PercentPipe,
    MoneyInputComponent,
    DisclaimerComponent,
    IconComponent,
    AmountComponent,
    SheetComponent,
    NumberChipsComponent,
    NumberGridComponent,
  ],
  templateUrl: './historico.component.html',
  styles: `
    .summary { padding: 0; overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; }
    @media (min-width: 768px) { .summary { grid-template-columns: repeat(4, 1fr); } }
    .summary > div { padding: 14px 16px; border-right: 1px solid var(--bd); border-bottom: 1px solid var(--bd); display: flex; flex-direction: column; gap: 2px; }
    .summary span { font-size: 12.5px; font-weight: 600; color: var(--tx2); }
    .summary b { font-size: 22px; line-height: 30px; font-weight: 800; }
    .summary .sm b { font-size: 17px; }
    .summary small { font-size: 12px; color: var(--tx3); font-weight: 600; }

    .round { padding: 0; overflow: hidden; border-left: 4px solid var(--bd); }
    .round.lucro { border-left-color: var(--ok); }
    .round.prejuizo { border-left-color: var(--er); }
    .r-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; background: none; border: 0; font: inherit; color: var(--tx); cursor: pointer; text-align: left; }
    .r-title { font-size: 17px; font-weight: 800; margin-top: 2px; }
    .r-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .r-right .res { font-weight: 800; font-size: 16px; }
    .chev { color: var(--tx3); transition: transform 220ms var(--ease); }
    .open .chev { transform: rotate(180deg); }
    .r-body { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 12px; animation: fade-up var(--t-enter) var(--ease); }
    .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding-top: 12px; border-top: 1px solid var(--bd); }
    .facts span { display: block; font-size: 12px; font-weight: 600; color: var(--tx2); }
    .facts b { font-size: 16px; font-weight: 800; }
    .facts > div:last-child { text-align: right; }
    .notes { font-size: 14px; color: var(--tx2); background: var(--sf2); border-radius: var(--r-md); padding: 10px 12px; }

    .hits { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
    .hits .tier-chip { min-height: 48px; }
    .result-box { background: var(--sf2); border-radius: var(--r-md); padding: 12px 14px; display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; }
    .result-box span { display: block; font-size: 12px; font-weight: 600; color: var(--tx2); }
    .result-box b { font-size: 17px; font-weight: 800; }
    .result-box .r b { font-size: 20px; }
    .result-box .r { text-align: right; }
    details.nums summary { cursor: pointer; font-weight: 700; font-size: 14px; color: var(--pri); margin: 10px 0; list-style: none; }
    details.nums summary::-webkit-details-marker { display: none; }
  `,
})
export class HistoricoComponent {
  protected readonly state = inject(AppStateService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  /** ?novo=1 abre o formulário já preenchido com a rodada atual. */
  readonly novo = input<string>();

  protected readonly summary = this.state.historySummary;
  protected readonly filter = signal<Filter>('all');
  protected readonly draft = signal<Draft | null>(null);
  protected readonly kindLabel = KIND_LABEL;
  /** Cards expandidos (os dois mais recentes começam abertos). */
  private readonly expanded = signal<Set<string> | null>(null);

  private readonly all = computed(() =>
    [...this.state.rounds()].reverse().map((r) => {
      const result = calculateProfit(r.prize ?? 0, r.investment);
      return { r, result, kind: classifyResult(result), roi: this.state.roundROI(r) };
    }),
  );
  protected readonly counts = computed(() => {
    const list = this.all();
    return { all: list.length, lucro: list.filter((x) => x.kind === 'lucro').length, prejuizo: list.filter((x) => x.kind === 'prejuizo').length };
  });
  protected readonly items = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.all() : this.all().filter((x) => x.kind === f);
  });

  protected readonly draftResult = computed(() => {
    const d = this.draft();
    if (!d) return null;
    const result = calculateProfit(d.prize ?? 0, d.investment);
    return { result, kind: classifyResult(result) };
  });

  protected readonly hitOptions = Array.from({ length: 11 }, (_, i) => i);

  constructor() {
    effect(() => {
      if (this.novo()) {
        untracked(() => this.openNew());
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
    });
  }

  protected isOpen(id: string, index: number): boolean {
    const set = this.expanded();
    return set ? set.has(id) : index < 2;
  }

  protected toggle(id: string, index: number): void {
    const set = new Set(this.expanded() ?? this.all().slice(0, 2).map((x) => x.r.id));
    if (this.isOpen(id, index)) set.delete(id);
    else set.add(id);
    this.expanded.set(set);
  }

  protected overline(r: Round): string {
    const [, m, d] = r.date.slice(0, 10).split('-');
    const date = m && d ? ` · ${d} ${MONTHS[Number(m) - 1] ?? ''}` : '';
    return `Rodada #${String(r.roundNumber).padStart(2, '0')}${date}`;
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
  }

  protected edit(round: Round): void {
    this.draft.set({
      ...round,
      numbers: [...round.numbers],
      isNew: false,
      advance: false,
      autoInvestment: calculateInvestment(round.games, round.betValue) === round.investment,
    });
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

  protected async remove(round: Round): Promise<void> {
    const result = calculateProfit(round.prize ?? 0, round.investment);
    const sign = result < 0 ? '− ' : result > 0 ? '+ ' : '';
    const ok = await this.ui.confirm({
      title: `Excluir rodada #${String(round.roundNumber).padStart(2, '0')}?`,
      message: `O resultado de ${sign}${formatBRL(Math.abs(result))} será removido do histórico e os totais serão recalculados. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      tone: 'danger',
      icon: 'trash',
    });
    if (ok) this.state.deleteRound(round.id);
  }
}
