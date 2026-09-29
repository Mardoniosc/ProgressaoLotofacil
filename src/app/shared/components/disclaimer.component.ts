import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Avisos de simulação e responsabilidade financeira. */
@Component({
  selector: 'app-disclaimer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="note">
      Os valores apresentados são simulações baseadas nas configurações informadas.
      Resultados reais dependem do sorteio e das regras vigentes.
    </p>
    @if (full()) {
      <p class="note">
        <strong>Atenção:</strong> esta ferramenta é apenas para controle e simulação. A progressão de apostas pode
        aumentar rapidamente o valor investido. Nunca utilize valores que comprometam seu orçamento.
      </p>
    }
  `,
  styles: `
    :host { display: block; margin-top: 8px; }
    .note { font-size: 0.78rem; color: var(--text-3); line-height: 1.5; margin: 0 0 6px; }
  `,
})
export class DisclaimerComponent {
  readonly full = input(false);
}
