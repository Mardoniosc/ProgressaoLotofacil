/** Wrapper mínimo em Promises sobre a API nativa do IndexedDB. */

export const DB_NAME = 'lotofacil-progressao';
export const DB_VERSION = 1;
export const STORE_SETTINGS = 'settings';
export const STORE_ROUNDS = 'rounds';

export type StoreName = typeof STORE_SETTINGS | typeof STORE_ROUNDS;

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transação abortada'));
  });
}

export function openDatabase(name = DB_NAME, factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // settings: pares chave/valor (bet, prizes, progression, ...)
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS);
      // rounds: histórico, chave = id
      if (!db.objectStoreNames.contains(STORE_ROUNDS)) db.createObjectStore(STORE_ROUNDS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Banco de dados bloqueado por outra aba'));
  });
}
