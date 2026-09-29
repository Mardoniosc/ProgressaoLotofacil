import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Bottom sheet no mobile (alcance do polegar) e diálogo central de 440px no desktop.
 * `variant="dialog"` é sempre central (confirmações).
 */
@Component({
  selector: 'app-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg [class]="variant()" (cancel)="$event.preventDefault(); closed.emit()" (click)="onBackdrop($event)"
      [attr.aria-labelledby]="heading() ? 'sheet-title' : null">
      <div class="panel">
        @if (variant() === 'sheet') { <div class="handle" aria-hidden="true"></div> }
        @if (heading()) {
          <div class="head">
            <h3 id="sheet-title">{{ heading() }}</h3>
            @if (meta()) { <span class="meta">{{ meta() }}</span> }
          </div>
        }
        <div class="body"><ng-content /></div>
      </div>
    </dialog>
  `,
  styles: `
    dialog { border: 0; padding: 0; background: transparent; max-width: none; max-height: none; color: var(--tx); overflow: visible; }
    dialog::backdrop { background: var(--backdrop); animation: fade var(--t-enter) var(--ease); }
    .panel { background: var(--sf); box-shadow: var(--sh-elev); display: flex; flex-direction: column; }
    .head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .head h3 { font-size: 22px; line-height: 28px; font-weight: 800; }
    .meta { font-size: 14px; font-weight: 600; color: var(--tx2); white-space: nowrap; }
    .body { display: flex; flex-direction: column; gap: 14px; }
    .handle { width: 40px; height: 5px; border-radius: 999px; background: var(--bd); margin: -6px auto 14px; }

    dialog.sheet { position: fixed; inset: auto 0 0 0; width: 100%; margin: 0; }
    dialog.sheet .panel { border-radius: var(--r-sheet) var(--r-sheet) 0 0; padding: 18px 20px calc(20px + env(safe-area-inset-bottom)); max-height: 92dvh; overflow-y: auto; animation: up var(--t-enter) var(--ease); }
    dialog.dialog { margin: auto; width: min(400px, calc(100% - 32px)); }
    dialog.dialog .panel { border-radius: var(--r-lg); padding: 24px; animation: pop var(--t-enter) var(--ease); }
    @media (min-width: 768px) {
      dialog.sheet { inset: 0; margin: auto; width: 440px; }
      dialog.sheet .panel { border-radius: var(--r-sheet); padding: 24px; animation: pop var(--t-enter) var(--ease); max-height: 88dvh; }
      dialog.sheet .handle { display: none; }
    }
    @keyframes up { from { transform: translateY(100%); } to { transform: none; } }
    @keyframes pop { from { transform: scale(.96); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes fade { from { opacity: 0; } }
  `,
})
export class SheetComponent {
  readonly open = input(false);
  readonly heading = input('');
  readonly meta = input('');
  readonly variant = input<'sheet' | 'dialog'>('sheet');
  readonly closed = output<void>();

  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.open() && !el.open) el.showModal?.();
      else if (!this.open() && el.open) el.close();
    });
  }

  protected onBackdrop(e: MouseEvent): void {
    // clique fora do painel (no próprio <dialog>) fecha
    if (e.target === this.dlg().nativeElement) this.closed.emit();
  }
}
