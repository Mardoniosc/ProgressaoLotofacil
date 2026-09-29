import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { LOTOFACIL_MAX_NUMBER, LOTOFACIL_MIN_NUMBER } from '../../core/models/defaults';
import { Pad2Pipe } from '../../shared/pipes/format.pipes';

/** Volante 5×5 (01–25) com seleção por toque e limite de números. */
@Component({
  selector: 'app-number-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pad2Pipe],
  template: `
    <div class="grid" role="group" aria-label="Volante da Lotofácil">
      @for (n of numbers; track n) {
        <button
          type="button"
          class="ball"
          [class.selected]="isSelected(n)"
          [disabled]="readonly() || (!isSelected(n) && complete())"
          [attr.aria-pressed]="isSelected(n)"
          [attr.data-number]="n"
          (click)="toggle(n)"
        >{{ n | pad2 }}</button>
      }
    </div>
    <div class="status" aria-live="polite">
      <span class="count" [class.done]="complete()"><strong>{{ selected().length }}</strong> / {{ max() }} números</span>
      @if (complete()) {
        <span class="badge ok">Jogo completo</span>
      } @else {
        <span class="hint">Faltam {{ max() - selected().length }}</span>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: clamp(6px, 2vw, 10px); max-width: 380px; margin: 0 auto; }
    .ball {
      aspect-ratio: 1; min-height: 48px; border-radius: 50%; border: 2px solid var(--border-strong);
      background: var(--surface); color: var(--text-1); font-size: clamp(1rem, 4.5vw, 1.2rem); font-weight: 700;
      font-variant-numeric: tabular-nums; cursor: pointer; transition: transform .12s ease, background .15s, border-color .15s, color .15s;
      -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    }
    .ball:hover:not(:disabled) { border-color: var(--primary); }
    .ball:active:not(:disabled) { transform: scale(.92); }
    .ball.selected { background: var(--primary); border-color: var(--primary); color: var(--on-primary); animation: pop .18s ease; box-shadow: 0 2px 8px var(--primary-soft); }
    .ball:disabled:not(.selected) { opacity: .35; cursor: not-allowed; }
    .ball:focus-visible { outline: 3px solid var(--primary-soft); outline-offset: 2px; }
    @keyframes pop { 50% { transform: scale(1.1); } }
    .status { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 14px; }
    .count { font-size: 1rem; color: var(--text-2); }
    .count strong { font-size: 1.25rem; color: var(--text-1); }
    .count.done strong { color: var(--success); }
    .hint { font-size: .85rem; color: var(--text-3); }
    @media (prefers-reduced-motion: reduce) { .ball, .ball.selected { transition: none; animation: none; } }
  `,
})
export class NumberGridComponent {
  readonly selected = model<number[]>([]);
  readonly max = input(15);
  readonly readonly = input(false);

  protected readonly numbers = Array.from(
    { length: LOTOFACIL_MAX_NUMBER - LOTOFACIL_MIN_NUMBER + 1 },
    (_, i) => i + LOTOFACIL_MIN_NUMBER,
  );
  readonly complete = computed(() => this.selected().length >= this.max());

  isSelected(n: number): boolean {
    return this.selected().includes(n);
  }

  /** Seleciona/remove um número; ignora quando o limite já foi atingido. */
  toggle(n: number): void {
    if (this.readonly() || n < LOTOFACIL_MIN_NUMBER || n > LOTOFACIL_MAX_NUMBER) return;
    const current = this.selected();
    if (current.includes(n)) {
      this.selected.set(current.filter((x) => x !== n));
    } else if (current.length < this.max()) {
      this.selected.set([...current, n].sort((a, b) => a - b));
    }
  }

  clear(): void {
    this.selected.set([]);
  }
}
