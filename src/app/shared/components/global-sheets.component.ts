import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { UiService } from '../../core/services/ui.service';
import { calculateInvestment } from '../../core/services/lotofacil-calculation.service';
import { BrlPipe } from '../pipes/format.pipes';
import { IconComponent } from './icon.component';
import { MoneyInputComponent } from './money-input.component';
import { SheetComponent } from './sheet.component';
import { EducationalInfoComponent } from './educational-info.component';

const PRESETS = [3, 3.5, 5];

/** Sheets e diálogos globais: confirmação, "Editar valor da aposta" e "Entenda os números". */
@Component({
  selector: 'app-global-sheets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, IconComponent, MoneyInputComponent, SheetComponent, EducationalInfoComponent],
  template: `
    <!-- Confirmação -->
    @let c = ui.confirmState();
    <app-sheet variant="dialog" [open]="!!c" (closed)="ui.settleConfirm(false)">
      @if (c) {
        <div class="confirm">
          <div class="c-icon" [class]="c.tone ?? 'danger'"><app-icon [name]="c.icon ?? 'trash'" [size]="22" /></div>
          <h3>{{ c.title }}</h3>
          <p>{{ c.message }}</p>
          <div class="btn-row even">
            <button type="button" class="btn neutral" (click)="ui.settleConfirm(false)">{{ c.cancelText ?? 'Cancelar' }}</button>
            <button type="button" class="btn" [class.danger]="(c.tone ?? 'danger') === 'danger'" [class.dark]="c.tone === 'dark'"
              (click)="ui.settleConfirm(true)">{{ c.confirmText }}</button>
          </div>
        </div>
      }
    </app-sheet>

    <!-- Editar valor da aposta -->
    <app-sheet heading="Editar valor da aposta" [open]="ui.betSheetOpen()" (closed)="ui.betSheetOpen.set(false)">
      <app-money-input size="lg" ariaLabel="Valor da aposta" [value]="draft()" (valueChange)="draft.set($event)" />
      <div class="chips">
        @for (p of presets; track p) {
          <button type="button" class="chip" [class.active]="draft() === p" (click)="draft.set(p)">
            @if (draft() === p) { <app-icon name="check" [size]="16" [stroke]="2.6" /> }
            {{ p | brl }}
          </button>
        }
      </div>
      <p class="caption">Novo investimento na rodada atual: <b class="strong">{{ newInvestment() | brl }}</b></p>
      <div class="btn-row">
        <button type="button" class="btn outline" (click)="ui.betSheetOpen.set(false)">Cancelar</button>
        <button type="button" class="btn" (click)="saveBet()">Salvar</button>
      </div>
    </app-sheet>

    <!-- Entenda os números -->
    <app-sheet heading="Entenda os números" [open]="ui.infoOpen()" (closed)="ui.infoOpen.set(false)">
      <app-educational-info />
      <button type="button" class="btn outline block" (click)="ui.infoOpen.set(false)">Fechar</button>
    </app-sheet>
  `,
  styles: `
    .confirm { display: flex; flex-direction: column; gap: 10px; }
    .confirm h3 { font-size: 20px; line-height: 26px; font-weight: 800; margin-top: 6px; }
    .confirm p { color: var(--tx2); font-size: 14.5px; line-height: 21px; margin-bottom: 10px; }
    .c-icon { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; background: var(--er-soft); color: var(--er); }
    .c-icon.dark { background: var(--wn-soft); color: var(--wn-tx); }
    .c-icon.primary { background: var(--pri-soft); color: var(--pri); }
  `,
})
export class GlobalSheetsComponent {
  protected readonly ui = inject(UiService);
  private readonly state = inject(AppStateService);
  protected readonly presets = PRESETS;
  protected readonly draft = signal(3);
  protected readonly newInvestment = computed(() => calculateInvestment(this.state.currentRow().games, this.draft()));

  constructor() {
    // ao abrir, o rascunho parte do valor atual
    effect(() => {
      if (this.ui.betSheetOpen()) untracked(() => this.draft.set(this.state.bet().betValue));
    });
  }

  protected saveBet(): void {
    this.state.setBetValue(this.draft());
    this.ui.betSheetOpen.set(false);
  }
}
