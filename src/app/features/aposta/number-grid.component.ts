import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { LOTOFACIL_MAX_NUMBER, LOTOFACIL_MIN_NUMBER } from '../../core/models/defaults';
import { Pad2Pipe } from '../../shared/pipes/format.pipes';

/** Volante 5×5 (01–25) com seleção por toque e limite de números. */
@Component({
  selector: 'app-number-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pad2Pipe],
  template: `
    <div class="status" aria-live="polite">
      <div>
        <span class="k">Números selecionados</span>
        <span class="count"><strong>{{ selected().length }}</strong> / {{ max() }}</span>
      </div>
      @if (complete()) {
        <span class="badge ok">✓ Completo</span>
      } @else {
        <span class="badge">Faltam {{ max() - selected().length }}</span>
      }
    </div>
    <div class="progress" [class.ok]="complete()"><span [style.width.%]="(selected().length / max()) * 100"></span></div>

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
    <div class="legend">
      <span><i class="sw sel"></i>Selecionado</span>
      <span><i class="sw off"></i>Bloqueado (limite)</span>
    </div>
  `,
  styles: `
    :host { display: block; }
    .status { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; margin-bottom: 10px; }
    .k { display: block; font-size: 13px; font-weight: 600; color: var(--tx2); }
    .count { font-size: 15px; font-weight: 700; color: var(--tx3); }
    .count strong { font-size: 28px; line-height: 34px; font-weight: 800; color: var(--tx); letter-spacing: -.02em; }
    .progress { margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: clamp(6px, 2.2vw, 10px); max-width: 420px; margin: 0 auto; }
    .ball {
      aspect-ratio: 1; min-height: 48px; border-radius: var(--r-md); border: 1.5px solid var(--bd);
      background: var(--sf); color: var(--tx2); font: inherit; font-size: clamp(17px, 5vw, 20px); font-weight: 800;
      cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      transition: transform var(--t-tap) var(--ease), background var(--t-state) var(--ease), border-color var(--t-state), color var(--t-state);
    }
    .ball:hover:not(:disabled) { border-color: var(--pri); color: var(--pri); background: var(--pri-soft); }
    .ball:active:not(:disabled) { transform: scale(.92); }
    .ball.selected { background: var(--pri); border-color: var(--pri); color: var(--on-pri); box-shadow: 0 4px 12px color-mix(in srgb, var(--pri) 28%, transparent); }
    .ball.selected:hover { background: var(--pri-hover); color: var(--on-pri); }
    /* desabilitado: borda tracejada + texto terciário (não depende só de opacidade) */
    .ball:disabled:not(.selected) { border-style: dashed; color: var(--tx3); background: transparent; cursor: not-allowed; }
    .legend { display: flex; justify-content: center; gap: 18px; margin-top: 14px; font-size: 12.5px; font-weight: 600; color: var(--tx2); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .sw { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
    .sw.sel { background: var(--pri); }
    .sw.off { border: 1.5px dashed var(--tx3); }
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
