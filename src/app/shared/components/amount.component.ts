import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const plain = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Valor monetário com o prefixo "R$" menor e em cor secundária.
 * `signed` mostra "+"/"−" e `arrow` acrescenta ↑/↓ (estado não depende só da cor).
 */
@Component({
  selector: 'app-amount',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="amt" [class.pos]="tone() === 'pos'" [class.neg]="tone() === 'neg'">{{ sign() }}<span class="cur">R$</span>{{ digits() }}{{ arrowChar() }}</span>`,
  styles: `:host { display: inline; } .pos .cur, .neg .cur { color: inherit; opacity: .8; }`,
})
export class AmountComponent {
  readonly value = input<number | null | undefined>(0);
  readonly signed = input(false);
  readonly arrow = input(false);
  /** Colore verde/vermelho conforme o sinal. */
  readonly colored = input(false);
  readonly compact = input(false);

  protected readonly digits = computed(() => {
    const v = Math.abs(this.value() ?? 0);
    return this.compact() && v >= 10_000 ? compact.format(v) : plain.format(v);
  });
  protected readonly sign = computed(() => {
    const v = this.value() ?? 0;
    if (v < -0.004) return '− ';
    return this.signed() && v > 0.004 ? '+ ' : '';
  });
  protected readonly tone = computed(() => {
    if (!this.colored()) return null;
    const v = this.value() ?? 0;
    return v > 0.004 ? 'pos' : v < -0.004 ? 'neg' : null;
  });
  protected readonly arrowChar = computed(() => {
    if (!this.arrow()) return '';
    const v = this.value() ?? 0;
    return v > 0.004 ? ' ↑' : v < -0.004 ? ' ↓' : '';
  });
}
