/** Faixas de premiação da Lotofácil. */
export type PrizeTier = 'hit11' | 'hit12' | 'hit13' | 'hit14' | 'hit15';

export const PRIZE_TIERS: readonly PrizeTier[] = ['hit11', 'hit12', 'hit13', 'hit14', 'hit15'];

export const TIER_HITS: Record<PrizeTier, number> = {
  hit11: 11,
  hit12: 12,
  hit13: 13,
  hit14: 14,
  hit15: 15,
};

/** Como o prêmio de uma faixa se comporta com a quantidade de jogos. */
export type PrizeMode = 'proportional' | 'fixed';

/** Base do cálculo de lucro/ROI: só a rodada ou todo o valor acumulado da progressão. */
export type ResultBasis = 'round' | 'accumulated';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface BetSettings {
  betValue: number;
  selectedNumbers: number[];
  /** Quantidade de números por jogo (padrão 15). */
  numbersPerGame: number;
}

export interface PrizeSettings {
  hit11: number;
  hit12: number;
  hit13: number;
  hit14: number;
  hit15: number;
}

export type PrizeModeSettings = Record<PrizeTier, PrizeMode>;

export type TierLabels = Record<PrizeTier, string>;

export interface ProgressionSettings {
  initialGames: number;
  multiplier: number;
  rounds: number;
  /** Rodada em que o usuário está atualmente (1 = primeira). */
  currentRound: number;
  resultBasis: ResultBasis;
}

export interface BankrollSettings {
  initialBankroll: number;
  maxRoundInvestment?: number;
}

export interface AppPreferences {
  appTitle: string;
  theme: ThemePreference;
  selectedTier: PrizeTier;
  onboardingCompleted: boolean;
}

export interface Round {
  id: string;
  date: string;
  roundNumber: number;
  games: number;
  betValue: number;
  investment: number;
  numbers: number[];
  hits?: number;
  prize?: number;
  result?: number;
  notes?: string;
}

/** Linha calculada da progressão. */
export interface ProgressionRow {
  round: number;
  games: number;
  investment: number;
  accumulated: number;
  prizes: Record<PrizeTier, number>;
}

/** Todas as configurações persistidas (exceto histórico). */
export interface AppSettings {
  bet: BetSettings;
  prizes: PrizeSettings;
  prizeModes: PrizeModeSettings;
  tierLabels: TierLabels;
  progression: ProgressionSettings;
  bankroll: BankrollSettings;
  preferences: AppPreferences;
}

/** Formato do arquivo de backup JSON. */
export interface BackupFile {
  app: 'lotofacil-progressao';
  version: number;
  exportedAt: string;
  settings: AppSettings;
  rounds: Round[];
}
