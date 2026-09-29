import { createDefaultSettings, LOTOFACIL_MAX_NUMBER, LOTOFACIL_MIN_NUMBER } from '../models/defaults';
import { AppSettings, BackupFile, PRIZE_TIERS, Round } from '../models/models';

export class BackupValidationError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNumberList = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= LOTOFACIL_MIN_NUMBER && n <= LOTOFACIL_MAX_NUMBER);

function fail(message: string): never {
  throw new BackupValidationError(message);
}

function validateRound(value: unknown, index: number): Round {
  if (!isObject(value)) fail(`Rodada ${index + 1}: formato inválido.`);
  const r = value;
  if (typeof r['id'] !== 'string' || !r['id']) fail(`Rodada ${index + 1}: id ausente.`);
  if (typeof r['date'] !== 'string') fail(`Rodada ${index + 1}: data inválida.`);
  for (const key of ['roundNumber', 'games', 'betValue', 'investment']) {
    if (!isNum(r[key]) || (r[key] as number) < 0) fail(`Rodada ${index + 1}: campo "${key}" inválido.`);
  }
  if (!isNumberList(r['numbers'])) fail(`Rodada ${index + 1}: números inválidos.`);
  for (const key of ['hits', 'prize', 'result']) {
    if (r[key] !== undefined && r[key] !== null && !isNum(r[key])) fail(`Rodada ${index + 1}: campo "${key}" inválido.`);
  }
  if (r['notes'] !== undefined && typeof r['notes'] !== 'string') fail(`Rodada ${index + 1}: observação inválida.`);
  return r as unknown as Round;
}

/**
 * Valida a estrutura de um backup e devolve configurações completas
 * (campos ausentes de versões anteriores são preenchidos com os padrões).
 */
export function validateBackup(data: unknown): { settings: AppSettings; rounds: Round[] } {
  if (!isObject(data)) fail('Arquivo não contém um objeto JSON válido.');
  if (data['app'] !== 'lotofacil-progressao') fail('O arquivo não é um backup do Lotofácil Progressão.');
  if (!isNum(data['version'])) fail('Versão do backup ausente.');
  const s = data['settings'];
  if (!isObject(s)) fail('Configurações ausentes no backup.');

  const defaults = createDefaultSettings();
  const bet = s['bet'];
  const prizes = s['prizes'];
  const progression = s['progression'];
  const bankroll = s['bankroll'];
  if (!isObject(bet) || !isNum(bet['betValue']) || bet['betValue'] < 0) fail('Valor da aposta inválido.');
  if (!isNumberList(bet['selectedNumbers'])) fail('Números da aposta inválidos.');
  if (!isObject(prizes) || !PRIZE_TIERS.every((t) => isNum(prizes[t]) && prizes[t] >= 0)) fail('Faixas de premiação inválidas.');
  if (!isObject(progression) || !isNum(progression['initialGames']) || !isNum(progression['multiplier']) || !isNum(progression['rounds'])) {
    fail('Configuração de progressão inválida.');
  }
  if (!isObject(bankroll) || !isNum(bankroll['initialBankroll'])) fail('Configuração de banca inválida.');

  const roundsRaw = data['rounds'];
  if (!Array.isArray(roundsRaw)) fail('Histórico de rodadas ausente.');
  const rounds = roundsRaw.map(validateRound);

  const settings: AppSettings = {
    bet: { ...defaults.bet, ...(bet as object) },
    prizes: { ...defaults.prizes, ...(prizes as object) },
    prizeModes: { ...defaults.prizeModes, ...(isObject(s['prizeModes']) ? s['prizeModes'] : {}) },
    tierLabels: { ...defaults.tierLabels, ...(isObject(s['tierLabels']) ? s['tierLabels'] : {}) },
    progression: { ...defaults.progression, ...(progression as object) },
    bankroll: { ...defaults.bankroll, ...(bankroll as object) },
    preferences: { ...defaults.preferences, ...(isObject(s['preferences']) ? s['preferences'] : {}) },
  };
  return { settings, rounds };
}

export function buildBackup(settings: AppSettings, rounds: Round[]): BackupFile {
  return {
    app: 'lotofacil-progressao',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    rounds,
  };
}
