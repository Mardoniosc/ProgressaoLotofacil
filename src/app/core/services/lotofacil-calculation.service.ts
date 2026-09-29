import { Injectable } from '@angular/core';
import {
  PRIZE_TIERS,
  PrizeMode,
  PrizeModeSettings,
  PrizeSettings,
  PrizeTier,
  ProgressionRow,
  ProgressionSettings,
  ResultBasis,
  Round,
} from '../models/models';

export type ResultKind = 'lucro' | 'prejuizo' | 'empate';

export interface BankrollUsage {
  initial: number;
  used: number;
  remaining: number;
  percentUsed: number;
  exceeded: boolean;
}

export interface BreakEven {
  /** Retorno necessário para recuperar exatamente o investimento. */
  amount: number;
  /** Mesmo valor dividido pela quantidade de jogos. */
  perGame: number;
}

export interface Scenario {
  tier: PrizeTier;
  round: number;
  games: number;
  investment: number;
  prize: number;
  result: number;
  roi: number;
  kind: ResultKind;
}

export interface HistorySummary {
  totalInvested: number;
  totalReceived: number;
  net: number;
  roi: number;
  count: number;
  bestHits: number | null;
  worstHits: number | null;
  bestResult: number | null;
  worstResult: number | null;
}

/** Arredonda para centavos evitando erros de ponto flutuante. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Quantidade de jogos da rodada `round` (1-based).
 * jogos = teto(jogosIniciais × multiplicador^(rodada − 1)), mínimo 1.
 */
export function calculateGamesForRound(initialGames: number, multiplier: number, round: number): number {
  const raw = Math.max(1, initialGames) * Math.pow(Math.max(1, multiplier), Math.max(0, round - 1));
  // tolerância para evitar que 2.0000000001 vire 3
  return Math.max(1, Math.ceil(raw - 1e-9));
}

/** investimento = quantidadeDeJogos × valorDaAposta */
export function calculateInvestment(games: number, betValue: number): number {
  return roundMoney(games * betValue);
}

/** Soma dos investimentos até a posição `upTo` (1-based, inclusive). Sem `upTo`, soma tudo. */
export function calculateAccumulatedInvestment(investments: readonly number[], upTo?: number): number {
  const slice = upTo === undefined ? investments : investments.slice(0, Math.max(0, upTo));
  return roundMoney(slice.reduce((sum, v) => sum + v, 0));
}

/** Prêmio simulado: proporcional (valor × jogos) ou fixo. */
export function calculatePrize(baseValue: number, games: number, mode: PrizeMode): number {
  return roundMoney(mode === 'proportional' ? baseValue * games : baseValue);
}

/** resultadoLiquido = premio − investimento */
export function calculateProfit(prize: number, investment: number): number {
  return roundMoney(prize - investment);
}

export function classifyResult(result: number): ResultKind {
  if (result > 0.004) return 'lucro';
  if (result < -0.004) return 'prejuizo';
  return 'empate';
}

/** ROI = ((retorno − investimento) / investimento) × 100. Investimento zero → 0. */
export function calculateROI(returned: number, investment: number): number {
  if (investment <= 0) return 0;
  return Math.round(((returned - investment) / investment) * 100 * 100) / 100;
}

/** Ponto de equilíbrio: retorno necessário para recuperar o investimento. */
export function calculateBreakEven(investment: number, games = 1): BreakEven {
  return {
    amount: roundMoney(investment),
    perGame: games > 0 ? roundMoney(investment / games) : 0,
  };
}

/** Uso da banca: restante = inicial − acumulado; percentual = acumulado / inicial × 100. */
export function calculateBankrollUsage(initialBankroll: number, accumulated: number): BankrollUsage {
  const remaining = roundMoney(initialBankroll - accumulated);
  const percentUsed = initialBankroll > 0 ? Math.round((accumulated / initialBankroll) * 100 * 100) / 100 : 0;
  return {
    initial: roundMoney(initialBankroll),
    used: roundMoney(accumulated),
    remaining,
    percentUsed,
    exceeded: accumulated > initialBankroll + 0.004,
  };
}

/** Gera a tabela de progressão com investimento, acumulado e prêmios simulados por faixa. */
export function generateProgression(
  progression: Pick<ProgressionSettings, 'initialGames' | 'multiplier' | 'rounds'>,
  betValue: number,
  prizes: PrizeSettings,
  modes: PrizeModeSettings,
): ProgressionRow[] {
  const rows: ProgressionRow[] = [];
  let accumulated = 0;
  for (let round = 1; round <= Math.max(1, progression.rounds); round++) {
    const games = calculateGamesForRound(progression.initialGames, progression.multiplier, round);
    const investment = calculateInvestment(games, betValue);
    accumulated = roundMoney(accumulated + investment);
    const rowPrizes = {} as Record<PrizeTier, number>;
    for (const tier of PRIZE_TIERS) {
      rowPrizes[tier] = calculatePrize(prizes[tier], games, modes[tier]);
    }
    rows.push({ round, games, investment, accumulated, prizes: rowPrizes });
  }
  return rows;
}

/** Calcula a rodada seguinte à `currentRound`. */
export function calculateNextRound(
  progression: Pick<ProgressionSettings, 'initialGames' | 'multiplier'>,
  betValue: number,
  currentRound: number,
): { round: number; games: number; investment: number } {
  const round = currentRound + 1;
  const games = calculateGamesForRound(progression.initialGames, progression.multiplier, round);
  return { round, games, investment: calculateInvestment(games, betValue) };
}

/** Investimento de referência para lucro/ROI conforme a base escolhida. */
export function basisInvestment(row: ProgressionRow, basis: ResultBasis): number {
  return basis === 'accumulated' ? row.accumulated : row.investment;
}

/** Cenário "E se eu acertar...". */
export function calculateScenario(row: ProgressionRow, tier: PrizeTier, basis: ResultBasis): Scenario {
  const investment = basisInvestment(row, basis);
  const prize = row.prizes[tier];
  const result = calculateProfit(prize, investment);
  return {
    tier,
    round: row.round,
    games: row.games,
    investment,
    prize,
    result,
    roi: calculateROI(prize, investment),
    kind: classifyResult(result),
  };
}

/** Resumo do histórico real de rodadas. */
export function summarizeHistory(rounds: readonly Round[]): HistorySummary {
  const totalInvested = roundMoney(rounds.reduce((s, r) => s + (r.investment || 0), 0));
  const totalReceived = roundMoney(rounds.reduce((s, r) => s + (r.prize || 0), 0));
  const hits = rounds.map((r) => r.hits).filter((h): h is number => typeof h === 'number');
  const results = rounds.map((r) => calculateProfit(r.prize || 0, r.investment || 0));
  return {
    totalInvested,
    totalReceived,
    net: calculateProfit(totalReceived, totalInvested),
    roi: calculateROI(totalReceived, totalInvested),
    count: rounds.length,
    bestHits: hits.length ? Math.max(...hits) : null,
    worstHits: hits.length ? Math.min(...hits) : null,
    bestResult: results.length ? Math.max(...results) : null,
    worstResult: results.length ? Math.min(...results) : null,
  };
}

/**
 * Motor de cálculo injetável. Apenas delega às funções puras acima,
 * que também podem ser importadas diretamente (e são testadas isoladamente).
 */
@Injectable({ providedIn: 'root' })
export class LotofacilCalculationService {
  readonly calculateGamesForRound = calculateGamesForRound;
  readonly calculateInvestment = calculateInvestment;
  readonly calculateAccumulatedInvestment = calculateAccumulatedInvestment;
  readonly calculatePrize = calculatePrize;
  readonly calculateProfit = calculateProfit;
  readonly classifyResult = classifyResult;
  readonly calculateROI = calculateROI;
  readonly calculateNextRound = calculateNextRound;
  readonly calculateBankrollUsage = calculateBankrollUsage;
  readonly calculateBreakEven = calculateBreakEven;
  readonly generateProgression = generateProgression;
  readonly calculateScenario = calculateScenario;
  readonly basisInvestment = basisInvestment;
  readonly summarizeHistory = summarizeHistory;
}
