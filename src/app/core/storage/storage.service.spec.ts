import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { createDefaultSettings } from '../models/defaults';
import { Round } from '../models/models';
import { BackupValidationError } from './backup-validation';
import { STORAGE_DB_NAME, StorageService } from './storage.service';

let dbCounter = 0;

const sampleRound = (p: Partial<Round> = {}): Round => ({
  id: `r-${Math.random().toString(36).slice(2)}`,
  date: '2026-10-01',
  roundNumber: 1,
  games: 1,
  betValue: 3,
  investment: 3,
  numbers: [1, 3, 4, 6, 7, 9, 11, 13, 15, 17, 18, 20, 21, 23, 25],
  hits: 13,
  prize: 30,
  ...p,
});

describe('StorageService (IndexedDB)', () => {
  let storage: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: STORAGE_DB_NAME, useValue: `test-db-${++dbCounter}` }],
    });
    storage = TestBed.inject(StorageService);
  });

  afterEach(async () => {
    await storage.close();
  });

  it('retorna configurações padrão quando o banco está vazio', async () => {
    expect(await storage.loadSettings()).toEqual(createDefaultSettings());
    expect(await storage.getRounds()).toEqual([]);
  });

  it('salva e recupera configurações', async () => {
    const d = createDefaultSettings();
    await storage.saveSetting('bet', { ...d.bet, betValue: 3.5, selectedNumbers: [1, 2, 3] });
    await storage.saveSetting('prizes', { ...d.prizes, hit14: 1000 });
    const loaded = await storage.loadSettings();
    expect(loaded.bet.betValue).toBe(3.5);
    expect(loaded.bet.selectedNumbers).toEqual([1, 2, 3]);
    expect(loaded.prizes.hit14).toBe(1000);
    expect(loaded.prizes.hit15).toBe(150000);
  });

  it('dados persistem entre conexões (reabrir o banco)', async () => {
    const d = createDefaultSettings();
    await storage.saveSetting('bankroll', { ...d.bankroll, initialBankroll: 1234 });
    await storage.saveRound(sampleRound({ id: 'persist' }));
    await storage.close();
    const loaded = await storage.loadSettings();
    expect(loaded.bankroll.initialBankroll).toBe(1234);
    expect((await storage.getRounds()).map((r) => r.id)).toEqual(['persist']);
  });

  it('salva, atualiza e recupera rodadas ordenadas', async () => {
    await storage.saveRound(sampleRound({ id: 'b', roundNumber: 2 }));
    await storage.saveRound(sampleRound({ id: 'a', roundNumber: 1 }));
    await storage.saveRound(sampleRound({ id: 'a', roundNumber: 1, prize: 60 }));
    const rounds = await storage.getRounds();
    expect(rounds.map((r) => r.id)).toEqual(['a', 'b']);
    expect(rounds[0].prize).toBe(60);
  });

  it('exclui uma rodada', async () => {
    await storage.saveRound(sampleRound({ id: 'x' }));
    await storage.saveRound(sampleRound({ id: 'y' }));
    await storage.deleteRound('x');
    expect((await storage.getRounds()).map((r) => r.id)).toEqual(['y']);
  });

  it('limpa todo o banco', async () => {
    await storage.saveSetting('bet', { ...createDefaultSettings().bet, betValue: 9 });
    await storage.saveRound(sampleRound());
    await storage.clearAll();
    expect(await storage.getRounds()).toEqual([]);
    expect((await storage.loadSettings()).bet.betValue).toBe(3);
  });

  it('exporta um backup completo', async () => {
    await storage.saveSetting('bet', { ...createDefaultSettings().bet, betValue: 4 });
    await storage.saveRound(sampleRound({ id: 'exp' }));
    const backup = await storage.exportData();
    expect(backup.app).toBe('lotofacil-progressao');
    expect(backup.version).toBe(1);
    expect(backup.settings.bet.betValue).toBe(4);
    expect(backup.rounds.map((r) => r.id)).toEqual(['exp']);
    // o backup precisa ser serializável em JSON
    expect(JSON.parse(JSON.stringify(backup))).toEqual(backup);
  });

  it('importa substituindo os dados atuais', async () => {
    await storage.saveRound(sampleRound({ id: 'old' }));
    const d = createDefaultSettings();
    const backup = {
      app: 'lotofacil-progressao',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: { ...d, bet: { ...d.bet, betValue: 5 } },
      rounds: [sampleRound({ id: 'new1' }), sampleRound({ id: 'new2', roundNumber: 2 })],
    };
    await storage.importData(JSON.parse(JSON.stringify(backup)));
    expect((await storage.getRounds()).map((r) => r.id)).toEqual(['new1', 'new2']);
    expect((await storage.loadSettings()).bet.betValue).toBe(5);
  });

  it('exporta e importa em ida e volta', async () => {
    await storage.saveSetting('progression', { ...createDefaultSettings().progression, multiplier: 3, currentRound: 4 });
    await storage.saveRound(sampleRound({ id: 'rt' }));
    const backup = await storage.exportData();
    await storage.clearAll();
    await storage.importData(JSON.parse(JSON.stringify(backup)));
    const again = await storage.exportData();
    expect(again.settings).toEqual(backup.settings);
    expect(again.rounds).toEqual(backup.rounds);
  });

  it('rejeita backup inválido sem alterar os dados', async () => {
    await storage.saveRound(sampleRound({ id: 'keep' }));
    await expect(storage.importData({ foo: 'bar' })).rejects.toBeInstanceOf(BackupValidationError);
    await expect(
      storage.importData({ app: 'lotofacil-progressao', version: 1, settings: createDefaultSettings(), rounds: [{ id: 1 }] }),
    ).rejects.toBeInstanceOf(BackupValidationError);
    expect((await storage.getRounds()).map((r) => r.id)).toEqual(['keep']);
  });

  it('completa campos ausentes de backups antigos com os padrões', async () => {
    const d = createDefaultSettings();
    const { prizeModes: _m, tierLabels: _l, preferences: _p, ...partial } = d;
    await storage.importData({ app: 'lotofacil-progressao', version: 1, settings: partial, rounds: [] });
    const loaded = await storage.loadSettings();
    expect(loaded.prizeModes).toEqual(d.prizeModes);
    expect(loaded.tierLabels).toEqual(d.tierLabels);
  });
});
