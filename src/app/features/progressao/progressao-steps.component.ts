import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppStateService } from '../../core/services/app-state.service';
import { BrlPipe, NumPipe } from '../../shared/pipes/format.pipes';
import { IconComponent } from '../../shared/components/icon.component';

function roundWindow(state: AppStateService) {
  const rows = state.progressionRows();
  const cur = state.progression().currentRound;
  const start = Math.max(0, Math.min(cur - 3, rows.length - 5));
  return rows.slice(start, start + 5);
}

const shortBrl = (v: number) => 'R$' + new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);

/** "Jogos por rodada": concluídas em azul, atual preenchida, futuras tracejadas. */
@Component({
  selector: 'app-jogos-por-rodada',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NumPipe],
  template: `
    <div class="bars">
      @for (r of rows(); track r.round) {
        <button type="button" class="col" [class.done]="r.round < cur()" [class.cur]="r.round === cur()" (click)="state.goToRound(r.round)"
          [attr.aria-label]="'Rodada ' + r.round + ': ' + r.games + ' jogos'">
          <span class="g">{{ r.games | num }}</span>
          <span class="bar" [style.height.px]="height(r.games)"></span>
        </button>
      }
    </div>
    <div class="track">
      @for (r of rows(); track r.round) {
        <div class="pt" [class.done]="r.round < cur()" [class.cur]="r.round === cur()">
          <span class="d"></span>
          <span class="l">R{{ r.round }}</span>
          <span class="v">{{ money(r.investment) }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .bars { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; align-items: end; height: 150px; }
    .col { display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; gap: 6px; height: 100%; background: none; border: 0; padding: 0; cursor: pointer; font: inherit; color: var(--tx); }
    .g { text-align: center; font-weight: 800; font-size: 15px; }
    .bar { display: block; border-radius: 6px; border: 1.5px dashed var(--bd); min-height: 8px; transition: height var(--t-enter) var(--ease); }
    .col.done .bar { background: var(--pri); border: 0; height: 8px !important; }
    .col.cur .g { color: var(--pri); }
    .col.cur .bar { background: var(--pri); border: 0; min-height: 26px; box-shadow: 0 6px 14px color-mix(in srgb, var(--pri) 30%, transparent); }
    .track { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; position: relative; margin-top: 14px; }
    .track::before { content: ''; position: absolute; left: 10%; right: 10%; top: 6px; height: 2px; background: var(--bd); }
    .pt { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .d { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--tx3); background: var(--sf); margin-bottom: 6px; }
    .pt.done .d { background: var(--pri); border-color: var(--pri); }
    .pt.cur .d { width: 18px; height: 18px; margin: -3px 0 3px; background: var(--pri); border-color: var(--sf); box-shadow: 0 0 0 3px var(--pri-soft), 0 0 0 1.5px var(--pri); }
    .l { font-size: 11.5px; font-weight: 700; color: var(--tx2); }
    .v { font-size: 12px; font-weight: 800; color: var(--tx); }
    .pt.cur .l, .pt.cur .v { color: var(--pri); }
  `,
})
export class JogosPorRodadaComponent {
  protected readonly state = inject(AppStateService);
  protected readonly cur = computed(() => this.state.progression().currentRound);
  protected readonly rows = computed(() => roundWindow(this.state));
  private readonly max = computed(() => Math.max(...this.rows().map((r) => r.games), 1));

  protected height(games: number): number {
    return Math.max(8, (games / this.max()) * 104);
  }

  protected money(v: number): string {
    return shortBrl(v);
  }
}

/** Linha do tempo das rodadas ao redor da atual. */
@Component({
  selector: 'app-linha-do-tempo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrlPipe, NumPipe, IconComponent],
  template: `
    <ol class="tl">
      @for (r of rows(); track r.round) {
        @let st = r.round < cur() ? 'done' : r.round === cur() ? 'cur' : r.round === cur() + 1 ? 'next' : 'future';
        <li [class]="st">
          <span class="mk">
            @if (st === 'done') { <app-icon name="check" [size]="14" [stroke]="3" /> } @else { {{ r.round }} }
          </span>
          <div class="body">
            <div>
              <span class="ov">Rodada {{ r.round }}{{ st === 'cur' ? ' · atual' : st === 'next' ? ' · próxima' : '' }}</span>
              <span class="t">{{ r.games | num }} {{ r.games === 1 ? 'jogo' : 'jogos' }}</span>
            </div>
            <b>{{ r.investment | brl }}</b>
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    .tl { list-style: none; margin: 0; padding: 0; position: relative; }
    li { display: grid; grid-template-columns: 28px 1fr; gap: 12px; position: relative; padding-bottom: 6px; }
    li:not(:last-child)::before { content: ''; position: absolute; left: 13px; top: 28px; bottom: -2px; width: 2px; background: var(--bd); }
    li.done:not(:last-child)::before { background: var(--ok); opacity: .5; }
    .mk { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 800; margin-top: 8px;
      border: 1.5px solid var(--bd); background: var(--sf); color: var(--tx2); position: relative; z-index: 1; }
    li.done .mk { background: var(--ok-soft); border-color: transparent; color: var(--ok); }
    li.cur .mk { background: var(--pri); border-color: var(--pri); color: var(--on-pri); box-shadow: 0 0 0 4px var(--pri-soft); }
    .body { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--r-md); }
    li.cur .body { background: var(--pri-soft); }
    .ov { display: block; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--tx3); }
    li.cur .ov { color: var(--pri); }
    .t { font-size: 16px; font-weight: 700; }
    b { font-size: 16px; font-weight: 800; white-space: nowrap; }
    li.cur b { color: var(--pri); font-size: 18px; }
  `,
})
export class LinhaDoTempoComponent {
  protected readonly state = inject(AppStateService);
  protected readonly cur = computed(() => this.state.progression().currentRound);
  protected readonly rows = computed(() => roundWindow(this.state));
}
