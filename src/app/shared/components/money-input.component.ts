import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { parseDecimal } from '../../core/utils/format';

const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Campo monetário em R$ que aceita "3,50", "3.50" ou "1.234,56". */
@Component({
  selector: 'app-money-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="money" [class.invalid]="invalid()" [class.lg]="size() === 'lg'" [class.center]="size() === 'lg'">
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
    .money {
      display: flex; align-items: center; gap: 6px; min-height: 48px; padding: 0 14px;
      border: 1px solid var(--bd); border-radius: var(--r-md); background: var(--sf);
      transition: border-color var(--t-state) var(--ease), box-shadow var(--t-state) var(--ease);
    }
    .money:focus-within { border-color: var(--pri); box-shadow: var(--ring); }
    .money.invalid { border-color: var(--er); background: var(--er-soft); }
    .prefix { color: var(--tx3); font-weight: 700; font-size: 15px; }
    input { border: 0 !important; box-shadow: none !important; background: transparent !important; padding: 0 !important;
      flex: 1; min-width: 0; min-height: 46px; font-weight: 800; font-size: 17px; }
    .money.lg { min-height: 64px; border-width: 1.5px; }
    .money.lg .prefix { font-size: 17px; }
    .money.lg input { font-size: 32px; letter-spacing: -0.02em; min-height: 60px; }
    .money.center { justify-content: center; }
    .money.center input { flex: 0 1 auto; width: 7ch; text-align: left; }
  `,
})
export class MoneyInputComponent {
  readonly value = model<number>(0);
  readonly inputId = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly min = input<number>(0);
  readonly size = input<'md' | 'lg'>('md');

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
