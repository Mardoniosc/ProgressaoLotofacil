import { AppSettings } from './models';

export const LOTOFACIL_MIN_NUMBER = 1;
export const LOTOFACIL_MAX_NUMBER = 25;
export const MIN_NUMBERS_PER_GAME = 15;
export const MAX_NUMBERS_PER_GAME = 20;
export const MAX_PROGRESSION_ROUNDS = 30;

/**
 * Configuração inicial. São valores de partida editáveis pelo usuário,
 * não os valores oficiais vigentes dos concursos.
 */
export function createDefaultSettings(): AppSettings {
  return {
    bet: {
      betValue: 3,
      selectedNumbers: [],
      numbersPerGame: 15,
    },
    prizes: {
      hit11: 6,
      hit12: 12,
      hit13: 30,
      hit14: 800,
      hit15: 150_000,
    },
    prizeModes: {
      hit11: 'proportional',
      hit12: 'proportional',
      hit13: 'proportional',
      hit14: 'proportional',
      hit15: 'fixed',
    },
    tierLabels: {
      hit11: '11 acertos',
      hit12: '12 acertos',
      hit13: '13 acertos',
      hit14: '14 acertos',
      hit15: '15 acertos',
    },
    progression: {
      initialGames: 1,
      multiplier: 2,
      rounds: 9,
      currentRound: 1,
      resultBasis: 'accumulated',
    },
    bankroll: {
      initialBankroll: 500,
      maxRoundInvestment: 500,
    },
    preferences: {
      appTitle: 'Lotofácil Progressão',
      theme: 'system',
      selectedTier: 'hit14',
      onboardingCompleted: false,
    },
  };
}
