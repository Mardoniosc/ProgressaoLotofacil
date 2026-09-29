const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function formatBRL(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return (compact ? brlCompact : brl).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return decimal.format(value);
}

/** +12,5% / −3% */
export function formatPercent(value: number | null | undefined, signed = true): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${decimal.format(value)}%`;
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Converte texto digitado em número. Aceita "3,50", "3.50", "1.234,56", "R$ 1.234,56".
 * Retorna null se não for um número.
 */
export function parseDecimal(text: string): number | null {
  let s = text.replace(/[^\d.,-]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // o último separador é o decimal
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > -1 && ((s.match(/\./g)?.length ?? 0) > 1 || /^-?\d{1,3}\.\d{3}$/.test(s))) {
    // "1.500.000" ou "150.000" → separador de milhar (padrão brasileiro)
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}
