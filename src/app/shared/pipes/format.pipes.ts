import { Pipe, PipeTransform } from '@angular/core';
import { formatBRL, formatDate, formatNumber, formatPercent, pad2 } from '../../core/utils/format';

@Pipe({ name: 'brl' })
export class BrlPipe implements PipeTransform {
  transform(value: number | null | undefined, compact = false): string {
    return formatBRL(value, compact);
  }
}

@Pipe({ name: 'pct' })
export class PercentPipe implements PipeTransform {
  transform(value: number | null | undefined, signed = true): string {
    return formatPercent(value, signed);
  }
}

@Pipe({ name: 'num' })
export class NumPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatNumber(value);
  }
}

@Pipe({ name: 'pad2' })
export class Pad2Pipe implements PipeTransform {
  transform(value: number): string {
    return pad2(value);
  }
}

@Pipe({ name: 'dateBr' })
export class DateBrPipe implements PipeTransform {
  transform(value: string): string {
    return formatDate(value);
  }
}

/** "1 jogo" / "4 jogos" */
@Pipe({ name: 'jogos' })
export class JogosPipe implements PipeTransform {
  transform(value: number): string {
    return `${formatNumber(value)} ${value === 1 ? 'jogo' : 'jogos'}`;
  }
}
