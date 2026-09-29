import { Injectable, InjectionToken, inject } from '@angular/core';
import { createDefaultSettings } from '../models/defaults';
import { AppSettings, BackupFile, Round } from '../models/models';
import { buildBackup, validateBackup } from './backup-validation';
import { DB_NAME, STORE_ROUNDS, STORE_SETTINGS, openDatabase, requestToPromise, transactionDone } from './indexed-db';

/** Permite usar outro nome de banco (ex.: testes). */
export const STORAGE_DB_NAME = new InjectionToken<string>('STORAGE_DB_NAME', {
  providedIn: 'root',
  factory: () => DB_NAME,
});

type SettingsKey = keyof AppSettings;
const SETTINGS_KEYS: SettingsKey[] = ['bet', 'prizes', 'prizeModes', 'tierLabels', 'progression', 'bankroll', 'preferences'];

/**
 * Persistência local em IndexedDB.
 * - store "settings": uma entrada por grupo de configuração (bet, prizes, ...)
 * - store "rounds": histórico de rodadas (keyPath = id)
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly dbName = inject(STORAGE_DB_NAME);
  private dbPromise?: Promise<IDBDatabase>;

  private db(): Promise<IDBDatabase> {
    this.dbPromise ??= openDatabase(this.dbName);
    return this.dbPromise;
  }

  /** Carrega as configurações completando campos ausentes com os padrões. */
  async loadSettings(): Promise<AppSettings> {
    const db = await this.db();
    const store = db.transaction(STORE_SETTINGS, 'readonly').objectStore(STORE_SETTINGS);
    const defaults = createDefaultSettings();
    const result = { ...defaults } as AppSettings;
    for (const key of SETTINGS_KEYS) {
      const stored = await requestToPromise(store.get(key));
      if (stored !== undefined) {
        (result as unknown as Record<string, unknown>)[key] = Array.isArray(stored)
          ? stored
          : { ...(defaults[key] as object), ...stored };
      }
    }
    return result;
  }

  async saveSetting<K extends SettingsKey>(key: K, value: AppSettings[K]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    tx.objectStore(STORE_SETTINGS).put(structuredClone(value), key);
    await transactionDone(tx);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    for (const key of SETTINGS_KEYS) store.put(structuredClone(settings[key]), key);
    await transactionDone(tx);
  }

  async getRounds(): Promise<Round[]> {
    const db = await this.db();
    const rounds = await requestToPromise(
      db.transaction(STORE_ROUNDS, 'readonly').objectStore(STORE_ROUNDS).getAll() as IDBRequest<Round[]>,
    );
    return rounds.sort((a, b) => a.roundNumber - b.roundNumber || a.date.localeCompare(b.date));
  }

  async saveRound(round: Round): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE_ROUNDS, 'readwrite');
    tx.objectStore(STORE_ROUNDS).put(structuredClone(round));
    await transactionDone(tx);
  }

  async deleteRound(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE_ROUNDS, 'readwrite');
    tx.objectStore(STORE_ROUNDS).delete(id);
    await transactionDone(tx);
  }

  /** Apaga configurações e histórico. */
  async clearAll(): Promise<void> {
    const db = await this.db();
    const tx = db.transaction([STORE_SETTINGS, STORE_ROUNDS], 'readwrite');
    tx.objectStore(STORE_SETTINGS).clear();
    tx.objectStore(STORE_ROUNDS).clear();
    await transactionDone(tx);
  }

  async exportData(): Promise<BackupFile> {
    const [settings, rounds] = await Promise.all([this.loadSettings(), this.getRounds()]);
    return buildBackup(settings, rounds);
  }

  /**
   * Valida e substitui todos os dados atuais pelos do backup (em uma única transação).
   * Lança BackupValidationError se a estrutura for inválida — nesse caso nada é alterado.
   */
  async importData(data: unknown): Promise<{ settings: AppSettings; rounds: Round[] }> {
    const parsed = validateBackup(data);
    const db = await this.db();
    const tx = db.transaction([STORE_SETTINGS, STORE_ROUNDS], 'readwrite');
    const settingsStore = tx.objectStore(STORE_SETTINGS);
    const roundsStore = tx.objectStore(STORE_ROUNDS);
    settingsStore.clear();
    roundsStore.clear();
    for (const key of SETTINGS_KEYS) settingsStore.put(structuredClone(parsed.settings[key]), key);
    for (const round of parsed.rounds) roundsStore.put(structuredClone(round));
    await transactionDone(tx);
    return parsed;
  }

  /** Fecha a conexão (usado em testes). */
  async close(): Promise<void> {
    if (!this.dbPromise) return;
    (await this.dbPromise).close();
    this.dbPromise = undefined;
  }
}
