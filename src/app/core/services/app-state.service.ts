import { Injectable, computed, inject, signal } from '@angular/core';
import { createDefaultSettings } from '../models/defaults';
import { AppSettings, PRIZE_TIERS, PrizeTier, Round } from '../models/models';
import { StorageService } from '../storage/storage.service';
import {
  basisInvestment,
  calculateBankrollUsage,
  calculateBreakEven,
  calculateProfit,
  calculateROI,
  calculateScenario,
  generateProgression,
  summarizeHistory,
} from './lotofacil-calculation.service';

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Estado central da aplicação baseado em Signals.
 * Toda alteração é refletida imediatamente nos signals e persistida no IndexedDB.
 */
@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly storage = inject(StorageService);

  readonly settings = signal<AppSettings>(createDefaultSettings());
  readonly rounds = signal<Round[]>([]);
  readonly loaded = signal(false);
  readonly storageError = signal<string | null>(null);

  // ---- fatias das configurações
  readonly bet = computed(() => this.settings().bet);
  readonly prizes = computed(() => this.settings().prizes);
  readonly prizeModes = computed(() => this.settings().prizeModes);
  readonly tierLabels = computed(() => this.settings().tierLabels);
  readonly progression = computed(() => this.settings().progression);
  readonly bankroll = computed(() => this.settings().bankroll);
  readonly preferences = computed(() => this.settings().preferences);
  readonly selectedTier = computed(() => this.preferences().selectedTier);

  // ---- progressão calculada
  /** Linhas suficientes para cobrir a tabela configurada e a próxima rodada. */
  private readonly extendedRows = computed(() => {
    const p = this.progression();
    const s = this.settings();
    return generateProgression(
      { ...p, rounds: Math.max(p.rounds, p.currentRound + 1) },
      s.bet.betValue,
      s.prizes,
      s.prizeModes,
    );
  });
  readonly progressionRows = computed(() => this.extendedRows().slice(0, this.progression().rounds));
  readonly currentRow = computed(() => this.extendedRows()[this.progression().currentRound - 1]);
  readonly nextRow = computed(() => this.extendedRows()[this.progression().currentRound]);

  /** Investimento de referência (rodada ou acumulado) na rodada atual. */
  readonly basisInvestment = computed(() => basisInvestment(this.currentRow(), this.progression().resultBasis));
  readonly breakEven = computed(() => calculateBreakEven(this.basisInvestment(), this.currentRow().games));
  readonly currentScenario = computed(() =>
    calculateScenario(this.currentRow(), this.selectedTier(), this.progression().resultBasis),
  );
  readonly bankrollUsage = computed(() =>
    calculateBankrollUsage(this.bankroll().initialBankroll, this.currentRow().accumulated),
  );
  readonly nextRoundOverLimit = computed(() => {
    const limit = this.bankroll().maxRoundInvestment;
    return !!limit && limit > 0 && this.nextRow().investment > limit;
  });
  readonly nextRoundOverBankroll = computed(
    () => this.nextRow().accumulated > this.bankroll().initialBankroll && this.bankroll().initialBankroll > 0,
  );

  readonly historySummary = computed(() => summarizeHistory(this.rounds()));

  tierLabel(tier: PrizeTier): string {
    return this.tierLabels()[tier];
  }

  // ---- carregamento

  async load(): Promise<void> {
    try {
      const [settings, rounds] = await Promise.all([this.storage.loadSettings(), this.storage.getRounds()]);
      this.settings.set(settings);
      this.rounds.set(rounds);
    } catch (err) {
      console.error(err);
      this.storageError.set('Não foi possível acessar o armazenamento local. Os dados não serão salvos nesta sessão.');
    } finally {
      this.loaded.set(true);
    }
  }

  // ---- atualização de configurações

  update<K extends keyof AppSettings>(key: K, patch: Partial<AppSettings[K]>): void {
    const value = { ...this.settings()[key], ...patch } as AppSettings[K];
    this.settings.update((s) => ({ ...s, [key]: value }));
    this.persist(() => this.storage.saveSetting(key, value));
  }

  setBetValue(betValue: number): void {
    this.update('bet', { betValue: Math.max(0, betValue) });
  }

  setSelectedNumbers(selectedNumbers: number[]): void {
    this.update('bet', { selectedNumbers: [...selectedNumbers].sort((a, b) => a - b) });
  }

  setSelectedTier(selectedTier: PrizeTier): void {
    this.update('preferences', { selectedTier });
  }

  goToRound(round: number): void {
    const p = this.progression();
    const currentRound = Math.min(Math.max(1, Math.round(round)), Math.max(p.rounds, 1));
    this.update('progression', { currentRound });
  }

  advanceRound(): void {
    const p = this.progression();
    // Avançar além da tabela aumenta a tabela, para nunca "perder" a rodada atual.
    const currentRound = p.currentRound + 1;
    this.update('progression', { currentRound, rounds: Math.max(p.rounds, currentRound) });
  }

  previousRound(): void {
    this.goToRound(this.progression().currentRound - 1);
  }

  resetProgression(): void {
    this.update('progression', { currentRound: 1 });
  }

  restorePrizeDefaults(): void {
    const d = createDefaultSettings();
    this.update('prizes', d.prizes);
    this.update('prizeModes', d.prizeModes);
  }

  restoreLabelDefaults(): void {
    this.update('tierLabels', createDefaultSettings().tierLabels);
    this.update('preferences', { appTitle: createDefaultSettings().preferences.appTitle });
  }

  /** Restaura a configuração inicial (valores, faixas, progressão e banca). Mantém números, histórico e preferências. */
  restoreInitialConfiguration(): void {
    const d = createDefaultSettings();
    const current = this.settings();
    const next: AppSettings = {
      ...d,
      bet: { ...d.bet, selectedNumbers: current.bet.selectedNumbers, numbersPerGame: current.bet.numbersPerGame },
      preferences: current.preferences,
    };
    this.settings.set(next);
    this.persist(() => this.storage.saveSettings(next));
  }

  // ---- histórico

  saveRound(round: Round): void {
    const normalized: Round = {
      ...round,
      id: round.id || newId(),
      result: calculateProfit(round.prize ?? 0, round.investment),
    };
    this.rounds.update((list) => {
      const others = list.filter((r) => r.id !== normalized.id);
      return [...others, normalized].sort((a, b) => a.roundNumber - b.roundNumber || a.date.localeCompare(b.date));
    });
    this.persist(() => this.storage.saveRound(normalized));
  }

  deleteRound(id: string): void {
    this.rounds.update((list) => list.filter((r) => r.id !== id));
    this.persist(() => this.storage.deleteRound(id));
  }

  roundROI(round: Round): number {
    return calculateROI(round.prize ?? 0, round.investment);
  }

  // ---- backup / reset

  exportData() {
    return this.storage.exportData();
  }

  async importData(data: unknown): Promise<void> {
    const { settings, rounds } = await this.storage.importData(data);
    this.settings.set(settings);
    this.rounds.set(rounds);
  }

  async resetAll(): Promise<void> {
    await this.storage.clearAll();
    this.settings.set(createDefaultSettings());
    this.rounds.set([]);
  }

  completeOnboarding(): void {
    // Garante que todas as configurações definidas no assistente sejam gravadas.
    const next = { ...this.settings(), preferences: { ...this.preferences(), onboardingCompleted: true } };
    this.settings.set(next);
    this.persist(() => this.storage.saveSettings(next));
  }

  readonly tiers = PRIZE_TIERS;

  private persist(op: () => Promise<void>): void {
    if (this.storageError()) return;
    op().catch((err) => {
      console.error(err);
      this.storageError.set('Falha ao salvar no armazenamento local.');
    });
  }
}
