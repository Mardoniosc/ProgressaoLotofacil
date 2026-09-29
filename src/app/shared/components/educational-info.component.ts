import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from './icon.component';

/** Textos explicativos curtos sobre os indicadores. */
@Component({
  selector: 'app-educational-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @for (item of items; track item.q) {
      <details [open]="$first">
        <summary>{{ item.q }} <app-icon name="chevron-down" [size]="18" /></summary>
        <p>{{ item.a }}</p>
      </details>
    }
  `,
  styles: `
    :host { display: block; }
    details { border-bottom: 1px solid var(--bd); }
    details:last-child { border-bottom: 0; }
    summary { list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 8px;
      min-height: 52px; font-weight: 700; font-size: 15px; color: var(--tx); }
    summary::-webkit-details-marker { display: none; }
    summary app-icon { color: var(--tx3); transition: transform 220ms var(--ease); }
    details[open] summary app-icon { transform: rotate(180deg); }
    p { color: var(--tx2); font-size: 14px; line-height: 21px; padding-bottom: 14px; }
  `,
})
export class EducationalInfoComponent {
  protected readonly items = [
    { q: 'O que significa ROI?', a: 'ROI mostra o retorno percentual em relação ao valor investido: ((retorno − investimento) ÷ investimento) × 100.' },
    { q: 'O que é investimento acumulado?', a: 'Soma de todos os valores utilizados nas rodadas anteriores, incluindo a rodada atual.' },
    { q: 'O que é ponto de equilíbrio?', a: 'Valor necessário de retorno para recuperar exatamente o investimento.' },
    {
      q: 'Importante',
      a: 'Aumentar a quantidade de jogos aumenta o investimento e também altera as probabilidades matemáticas de ocorrência de determinadas combinações, mas não garante premiação.',
    },
  ];
}
