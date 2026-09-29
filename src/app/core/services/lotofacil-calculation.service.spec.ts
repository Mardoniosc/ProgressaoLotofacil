import { TestBed } from '@angular/core/testing';
import { createDefaultSettings } from '../models/defaults';
import { Round } from '../models/models';
import {
  LotofacilCalculationService,
  calculateAccumulatedInvestment,
  calculateBankrollUsage,
  calculateBreakEven,
  calculateGamesForRound,
  calculateInvestment,
  calculateNextRound,
  calculatePrize,
  calculateProfit,
  calculateROI,
  calculateScenario,
  classifyResult,
  generateProgression,
  roundMoney,
  summarizeHistory,
} from './lotofacil-calculation.service';

const d = createDefaultSettings();
const rows = (betValue = 3, multiplier = 2, rounds = 9) =>
  generateProgression({ initialGames: 1, multiplier, rounds }, betValue, d.prizes, d.prizeModes);

describe('LotofacilCalculationService', () => {
  it('é injetável e expõe as funções puras', () => {
    const svc = TestBed.inject(LotofacilCalculationService);
    expect(svc.calculateInvestment(4, 3)).toBe(12);
    expect(svc.generateProgression).toBe(generateProgression);
  });

  describe('quantidade de jogos', () => {
    it('1 jogo na rodada 1, 2 na rodada 2, 4 na rodada 3', () => {
      expect(calculateGamesForRound(1, 2, 1)).toBe(1);
      expect(calculateGamesForRound(1, 2, 2)).toBe(2);
      expect(calculateGamesForRound(1, 2, 3)).toBe(4);
    });

    it('dobra até 256 jogos na rodada 9', () => {
      expect(rows().map((r) => r.games)).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 256]);
    });

    it('arredonda para cima com fator 1,5x', () => {
      expect([1, 2, 3, 4, 5, 6].map((r) => calculateGamesForRound(1, 1.5, r))).toEqual([1, 2, 3, 4, 6, 8]);
    });

    it('fator 3x', () => {
      expect([1, 2, 3, 4].map((r) => calculateGamesForRound(1, 3, r))).toEqual([1, 3, 9, 27]);
    });

    it('respeita jogos iniciais e nunca retorna menos que 1', () => {
      expect(calculateGamesForRound(5, 2, 3)).toBe(20);
      expect(calculateGamesForRound(0, 0, 1)).toBe(1);
    });
  });

  describe('investimento', () => {
    it('investimento = jogos × valor da aposta', () => {
      expect(calculateInvestment(1, 3)).toBe(3);
      expect(calculateInvestment(2, 3)).toBe(6);
      expect(calculateInvestment(4, 3)).toBe(12);
      expect(calculateInvestment(3, 3.5)).toBe(10.5);
    });

    it('progressão com R$ 3,00 gera 3, 6, 12 ... 768', () => {
      expect(rows().map((r) => r.investment)).toEqual([3, 6, 12, 24, 48, 96, 192, 384, 768]);
    });

    it('todos os valores mudam quando o valor da aposta muda', () => {
      expect(rows(3.5, 2, 4).map((r) => r.investment)).toEqual([3.5, 7, 14, 28]);
      expect(rows(5, 2, 3).map((r) => r.investment)).toEqual([5, 10, 20]);
    });

    it('evita erros de ponto flutuante', () => {
      expect(calculateInvestment(3, 0.1)).toBe(0.3);
      expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    });
  });

  describe('acumulado', () => {
    it('soma as rodadas: 3, 9, 21, 45, 93, 189', () => {
      expect(rows(3, 2, 6).map((r) => r.accumulated)).toEqual([3, 9, 21, 45, 93, 189]);
    });

    it('calculateAccumulatedInvestment com e sem limite', () => {
      const inv = [3, 6, 12, 24];
      expect(calculateAccumulatedInvestment(inv)).toBe(45);
      expect(calculateAccumulatedInvestment(inv, 2)).toBe(9);
      expect(calculateAccumulatedInvestment([])).toBe(0);
    });
  });

  describe('prêmios', () => {
    it('proporcional multiplica pela quantidade de jogos; fixo não', () => {
      expect(calculatePrize(6, 8, 'proportional')).toBe(48);
      expect(calculatePrize(150000, 8, 'fixed')).toBe(150000);
    });

    it('tabela principal da rodada 4 (8 jogos)', () => {
      const r4 = rows()[3];
      expect(r4.prizes).toEqual({ hit11: 48, hit12: 96, hit13: 240, hit14: 6400, hit15: 150000 });
    });
  });

  describe('lucro / prejuízo', () => {
    it('lucro', () => {
      expect(calculateProfit(48, 24)).toBe(24);
      expect(classifyResult(24)).toBe('lucro');
    });

    it('prejuízo', () => {
      expect(calculateProfit(6, 21)).toBe(-15);
      expect(classifyResult(-15)).toBe('prejuizo');
    });

    it('empate', () => {
      expect(calculateProfit(12, 12)).toBe(0);
      expect(classifyResult(0)).toBe('empate');
    });
  });

  describe('ROI', () => {
    it('ROI = ((retorno − investimento) / investimento) × 100', () => {
      expect(calculateROI(60, 30)).toBe(100);
      expect(calculateROI(15, 30)).toBe(-50);
      expect(calculateROI(30, 30)).toBe(0);
    });

    it('investimento zero retorna 0 (sem divisão por zero)', () => {
      expect(calculateROI(100, 0)).toBe(0);
    });

    it('cenário de 14 acertos na rodada 5 sobre o acumulado (R$ 93 → R$ 12.800)', () => {
      const sc = calculateScenario(rows()[4], 'hit14', 'accumulated');
      expect(sc.investment).toBe(93);
      expect(sc.prize).toBe(12800);
      expect(sc.result).toBe(12707);
      expect(sc.roi).toBeCloseTo(13663.44, 2);
      expect(sc.kind).toBe('lucro');
    });

    it('cenário sobre a rodada usa apenas o investimento da rodada', () => {
      const sc = calculateScenario(rows()[3], 'hit11', 'round');
      expect(sc.investment).toBe(24);
      expect(sc.prize).toBe(48);
      expect(sc.result).toBe(24);
      expect(sc.roi).toBe(100);
    });
  });

  describe('ponto de equilíbrio', () => {
    it('é igual ao investimento, também por jogo', () => {
      expect(calculateBreakEven(93, 16)).toEqual({ amount: 93, perGame: 5.81 });
      expect(calculateBreakEven(0, 0)).toEqual({ amount: 0, perGame: 0 });
    });
  });

  describe('banca', () => {
    it('restante e percentual utilizado', () => {
      const u = calculateBankrollUsage(500, 93);
      expect(u.remaining).toBe(407);
      expect(u.percentUsed).toBe(18.6);
      expect(u.exceeded).toBe(false);
    });

    it('detecta banca ultrapassada', () => {
      const u = calculateBankrollUsage(500, 765);
      expect(u.remaining).toBe(-265);
      expect(u.exceeded).toBe(true);
    });

    it('banca zero não divide por zero', () => {
      expect(calculateBankrollUsage(0, 10).percentUsed).toBe(0);
    });
  });

  describe('próxima rodada', () => {
    it('calcula jogos e investimento da rodada seguinte', () => {
      expect(calculateNextRound({ initialGames: 1, multiplier: 2 }, 3, 6)).toEqual({ round: 7, games: 64, investment: 192 });
    });
  });

  describe('histórico', () => {
    const round = (p: Partial<Round>): Round => ({
      id: Math.random().toString(),
      date: '2026-10-01',
      roundNumber: 1,
      games: 1,
      betValue: 3,
      investment: 3,
      numbers: [],
      ...p,
    });

    it('resume totais, ROI real, melhor e pior', () => {
      const s = summarizeHistory([
        round({ investment: 3, hits: 13, prize: 30 }),
        round({ investment: 6, hits: 9, prize: 0 }),
        round({ investment: 12, hits: 11, prize: 12 }),
      ]);
      expect(s.totalInvested).toBe(21);
      expect(s.totalReceived).toBe(42);
      expect(s.net).toBe(21);
      expect(s.roi).toBe(100);
      expect(s.count).toBe(3);
      expect(s.bestHits).toBe(13);
      expect(s.worstHits).toBe(9);
      expect(s.bestResult).toBe(27);
      expect(s.worstResult).toBe(-6);
    });

    it('histórico vazio', () => {
      const s = summarizeHistory([]);
      expect(s).toMatchObject({ totalInvested: 0, totalReceived: 0, net: 0, roi: 0, count: 0, bestHits: null });
    });
  });
});
