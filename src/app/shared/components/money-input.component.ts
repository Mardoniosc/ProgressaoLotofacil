import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { parseDecimal } from '../../core/utils/format';

const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Campo monetário em R$ que aceita "3,50", "3.50" ou "1.234,56". */
@Component({
  selector: 'app-money-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="money" [class.invalid]="invalid()">
      <span class="prefix">R$</span>
      <input
        type="text"
        inputmode="decimal"
        autocomplete="off"
        [id]="inputId()"
        [attr.aria-label]="ariaLabel() || null"
        [value]="display()"
        (focus)="onFocus($event)"
        (input)="draft.set($any($event.target).value)"
        (blur)="commit()"
        (keydown.enter)="$any($event.target).blur()"
      />
    </div>
  `,
  styles: `
    .money { display: flex; align-items: center; border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--surface); transition: border-color .15s, box-shadow .15s; }
    .money:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
    .money.invalid { border-color: var(--danger); }
    .prefix { padding-left: 12px; color: var(--text-3); font-weight: 600; font-size: 0.9rem; }
    input { border: 0 !important; box-shadow: none !important; background: transparent !important; flex: 1; min-width: 0; font-variant-numeric: tabular-nums; }
  `,
})
export class MoneyInputComponent {
  readonly value = model<number>(0);
  readonly inputId = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly min = input<number>(0);

  protected readonly draft = signal<string | null>(null);
  protected readonly display = computed(() => this.draft() ?? fmt.format(this.value() ?? 0));
  protected readonly invalid = computed(() => {
    const d = this.draft();
    return d !== null && d.trim() !== '' && parseDecimal(d) === null;
  });

  protected onFocus(e: FocusEvent): void {
    this.draft.set(fmt.format(this.value() ?? 0));
    queueMicrotask(() => (e.target as HTMLInputElement).select());
  }

  protected commit(): void {
    const d = this.draft();
    this.draft.set(null);
    if (d === null) return;
    const n = parseDecimal(d);
    if (n === null) return;
    const v = Math.max(this.min(), Math.round(n * 100) / 100);
    if (v !== this.value()) this.value.set(v);
  }
}
