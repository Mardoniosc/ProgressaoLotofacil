import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Textos explicativos curtos sobre os indicadores. */
@Component({
  selector: 'app-educational-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 style="margin-bottom: 6px">Entenda os indicadores</h2>
    <details class="info">
      <summary>O que significa ROI?</summary>
      <p>ROI mostra o retorno percentual em relação ao valor investido: ((retorno − investimento) ÷ investimento) × 100.</p>
    </details>
    <details class="info">
      <summary>O que é investimento acumulado?</summary>
      <p>Soma de todos os valores utilizados nas rodadas anteriores, incluindo a rodada atual.</p>
    </details>
    <details class="info">
      <summary>O que é ponto de equilíbrio?</summary>
      <p>Valor necessário de retorno para recuperar exatamente o investimento.</p>
    </details>
    <details class="info">
      <summary>Importante</summary>
      <p>
        Aumentar a quantidade de jogos aumenta o investimento e também altera as probabilidades matemáticas de
        ocorrência de determinadas combinações, mas não garante premiação.
      </p>
    </details>
  `,
})
export class EducationalInfoComponent {}
