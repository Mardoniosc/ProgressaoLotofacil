import { formatBRL, formatDate, formatPercent, parseDecimal } from './format';

describe('format utils', () => {
  it('parseDecimal aceita formatos brasileiros e internacionais', () => {
    expect(parseDecimal('3,50')).toBe(3.5);
    expect(parseDecimal('3.50')).toBe(3.5);
    expect(parseDecimal('1.234,56')).toBe(1234.56);
    expect(parseDecimal('1,234.56')).toBe(1234.56);
    expect(parseDecimal('R$ 150.000,00')).toBe(150000);
    expect(parseDecimal('150.000')).toBe(150000);
    expect(parseDecimal('3.5')).toBe(3.5);
    expect(parseDecimal('1.500.000')).toBe(1500000);
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('')).toBeNull();
  });

  it('formatBRL', () => {
    expect(formatBRL(3).replace(/\s/g, ' ')).toBe('R$ 3,00');
    expect(formatBRL(150000).replace(/\s/g, ' ')).toBe('R$ 150.000,00');
    expect(formatBRL(null)).toBe('—');
  });

  it('formatPercent com sinal', () => {
    expect(formatPercent(100)).toBe('+100%');
    expect(formatPercent(-50)).toBe('-50%');
    expect(formatPercent(13663.44)).toBe('+13.663,44%');
  });

  it('formatDate', () => {
    expect(formatDate('2026-10-01')).toBe('01/10/2026');
  });
});
