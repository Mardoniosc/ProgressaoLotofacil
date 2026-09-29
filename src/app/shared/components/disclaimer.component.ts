import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

/** Avisos de simulação e responsabilidade financeira. */
@Component({
  selector: 'app-disclaimer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (full()) {
      <div class="responsibility">
        <app-icon name="shield" [size]="20" />
        <div>
          <strong>Use com responsabilidade</strong>
          A progressão aumenta rapidamente o valor investido. Esta ferramenta é apenas para controle e simulação —
          utilize apenas valores compatíveis com seu orçamento.
        </div>
      </div>
    }
    <p class="note">
      Os valores apresentados são simulações baseadas nas configurações informadas.
      Resultados reais dependem do sorteio e das regras vigentes.
    </p>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 12px; }
    .note { font-size: 12px; line-height: 17px; color: var(--tx3); font-weight: 500; text-align: center; padding: 0 8px; }
  `,
})
export class DisclaimerComponent {
  readonly full = input(false);
}
