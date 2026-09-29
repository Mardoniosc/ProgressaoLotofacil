import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { STORAGE_DB_NAME, StorageService } from '../storage/storage.service';
import { AppStateService } from './app-state.service';

let n = 0;

describe('AppStateService', () => {
  let state: AppStateService;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: STORAGE_DB_NAME, useValue: `state-db-${++n}` }] });
    state = TestBed.inject(AppStateService);
    await state.load();
  });

  afterEach(() => TestBed.inject(StorageService).close());

  it('começa na rodada 1 com 1 jogo e próxima rodada de 2 jogos', () => {
    expect(state.currentRow().games).toBe(1);
    expect(state.currentRow().investment).toBe(3);
    expect(state.nextRow().games).toBe(2);
    expect(state.nextRow().investment).toBe(6);
  });

  it('recalcula tudo quando o valor da aposta muda', () => {
    state.setBetValue(5);
    expect(state.currentRow().investment).toBe(5);
    expect(state.progressionRows()[3].investment).toBe(40);
  });

  it('avança e volta rodadas, expandindo a tabela quando necessário', () => {
    state.update('progression', { rounds: 2 });
    state.advanceRound();
    state.advanceRound();
    expect(state.progression().currentRound).toBe(3);
    expect(state.progression().rounds).toBe(3);
    expect(state.currentRow().accumulated).toBe(21);
    state.previousRound();
    expect(state.progression().currentRound).toBe(2);
    state.resetProgression();
    expect(state.progression().currentRound).toBe(1);
  });

  it('alerta quando a próxima rodada ultrapassa o limite configurado', () => {
    state.update('bankroll', { maxRoundInvestment: 100 });
    state.goToRound(6); // próxima = 64 jogos = R$ 192
    expect(state.nextRoundOverLimit()).toBe(true);
    state.update('bankroll', { maxRoundInvestment: 0 });
    expect(state.nextRoundOverLimit()).toBe(false);
  });

  it('persiste alterações e as recarrega', async () => {
    state.setBetValue(4);
    state.setSelectedNumbers([25, 1, 13]);
    state.saveRound({ id: '', date: '2026-10-01', roundNumber: 1, games: 1, betValue: 4, investment: 4, numbers: [], prize: 30, hits: 13 });
    await new Promise((r) => setTimeout(r, 50));

    const fresh = TestBed.runInInjectionContext(() => new AppStateService());
    await fresh.load();
    expect(fresh.bet().betValue).toBe(4);
    expect(fresh.bet().selectedNumbers).toEqual([1, 13, 25]);
    expect(fresh.rounds().length).toBe(1);
    expect(fresh.rounds()[0].result).toBe(26);
  });

  it('reset apaga tudo e volta ao onboarding', async () => {
    state.completeOnboarding();
    state.setBetValue(10);
    await state.resetAll();
    expect(state.preferences().onboardingCompleted).toBe(false);
    expect(state.bet().betValue).toBe(3);
    expect(state.rounds()).toEqual([]);
  });
});
