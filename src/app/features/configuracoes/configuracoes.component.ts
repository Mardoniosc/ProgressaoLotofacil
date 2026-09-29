import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { ThemeService } from '../../core/services/theme.service';
import { PwaService } from '../../core/services/pwa.service';
import { BackupValidationError } from '../../core/storage/backup-validation';
import { ThemePreference } from '../../core/models/models';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { BankrollBarComponent } from '../../shared/components/widgets';

export const BACKUP_FILENAME = 'lotofacil-progressao-backup.json';

@Component({
  selector: 'app-configuracoes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MoneyInputComponent, DisclaimerComponent, BankrollBarComponent],
  template: `
    <div class="page stack">
      <header class="page-head">
        <h1>Configurações</h1>
        <p>Preferências, banca e armazenamento local.</p>
      </header>

      <section class="card">
        <div class="card-head"><h2>Minha banca</h2></div>
        <div class="fields cols-2">
          <div class="field">
            <label for="bankroll">Banca disponível</label>
            <app-money-input inputId="bankroll" [value]="state.bankroll().initialBankroll"
              (valueChange)="state.update('bankroll', { initialBankroll: $event })" />
          </div>
          <div class="field">
            <label for="maxRound">Limite máximo por rodada</label>
            <app-money-input inputId="maxRound" [value]="state.bankroll().maxRoundInvestment ?? 0"
              (valueChange)="state.update('bankroll', { maxRoundInvestment: $event })" />
            <span class="hint">Use 0 para desativar o alerta de limite.</span>
          </div>
        </div>
        <div style="margin-top: 16px"><app-bankroll-bar /></div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Aparência</h2></div>
        <div class="chips" role="radiogroup" aria-label="Tema">
          @for (t of themes; track t.value) {
            <button type="button" class="chip" role="radio" [class.active]="theme.preference() === t.value"
              [attr.aria-checked]="theme.preference() === t.value" (click)="setTheme(t.value)">{{ t.label }}</button>
          }
        </div>
        <p class="small muted" style="margin-top: 10px">
          Nomes das faixas e título do app podem ser alterados em <a routerLink="/premiacoes">Premiações</a>.
        </p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Premiações e progressão</h2></div>
        <div class="row">
          <a class="btn" routerLink="/premiacoes">Configurar faixas</a>
          <a class="btn" routerLink="/progressao">Configurar progressão</a>
          <button class="btn" type="button" (click)="restoreInitial()">Restaurar configuração inicial</button>
          <button class="btn ghost" type="button" (click)="rerunOnboarding()">Refazer assistente inicial</button>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div>
            <h2>Dados locais</h2>
            <p>Tudo fica salvo apenas neste navegador (IndexedDB). Nenhum dado é enviado para servidores.</p>
          </div>
        </div>
        <div class="row">
          <button class="btn primary" type="button" (click)="exportData()">Exportar dados (JSON)</button>
          <label class="btn">
            Importar dados
            <input type="file" accept="application/json,.json" hidden (change)="importFile($event)" />
          </label>
        </div>
        @if (message(); as m) {
          <p class="small" [class.text-danger]="m.error" [class.text-lucro]="!m.error" role="status" style="margin-top: 10px">{{ m.text }}</p>
        }
        <p class="small muted" style="margin-top: 10px">
          {{ state.rounds().length }} rodada(s) no histórico ·
          Service worker: {{ pwa.serviceWorkerEnabled ? 'ativo (funciona offline)' : 'inativo neste modo' }}
          @if (storageInfo(); as s) { · Armazenamento: {{ s }} }
        </p>
      </section>

      <section class="card" style="border-color: var(--danger)">
        <div class="card-head"><h2 class="text-danger">Zona de perigo</h2></div>
        <p class="small muted">Essa ação apagará suas apostas, configurações e histórico localmente.</p>
        <button class="btn danger" type="button" (click)="resetAll()">Apagar todos os dados</button>
      </section>

      <app-disclaimer [full]="true" />
    </div>
  `,
})
export class ConfiguracoesComponent {
  protected readonly state = inject(AppStateService);
  protected readonly theme = inject(ThemeService);
  protected readonly pwa = inject(PwaService);
  private readonly router = inject(Router);

  protected readonly message = signal<{ text: string; error: boolean } | null>(null);
  protected readonly storageInfo = signal<string | null>(null);
  protected readonly themes: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'Sistema' },
    { value: 'light', label: '☀️ Claro' },
    { value: 'dark', label: '🌙 Escuro' },
  ];

  constructor() {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    // Pede ao navegador para não descartar os dados locais automaticamente.
    storage?.persist?.().then((persisted) =>
      this.storageInfo.set(persisted ? 'persistente' : 'padrão do navegador'),
    ).catch(() => undefined);
  }

  protected setTheme(value: ThemePreference): void {
    this.theme.set(value);
  }

  protected async exportData(): Promise<void> {
    const data = await this.state.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = BACKUP_FILENAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.message.set({ text: `Backup exportado: ${BACKUP_FILENAME}`, error: false });
  }

  protected async importFile(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!confirm('A importação substituirá os dados atuais. Deseja continuar?')) return;
      await this.state.importData(json);
      this.message.set({ text: 'Dados importados com sucesso.', error: false });
    } catch (err) {
      const text =
        err instanceof BackupValidationError
          ? `Arquivo inválido: ${err.message}`
          : err instanceof SyntaxError
            ? 'Arquivo inválido: não é um JSON válido.'
            : 'Não foi possível importar os dados.';
      this.message.set({ text, error: true });
    }
  }

  protected restoreInitial(): void {
    if (confirm('Restaurar valor da aposta, premiações, progressão e banca para a configuração inicial? Seus números e histórico serão mantidos.')) {
      this.state.restoreInitialConfiguration();
      this.message.set({ text: 'Configuração inicial restaurada.', error: false });
    }
  }

  protected rerunOnboarding(): void {
    this.state.update('preferences', { onboardingCompleted: false });
    this.router.navigate(['/boas-vindas']);
  }

  protected async resetAll(): Promise<void> {
    if (!confirm('Essa ação apagará suas apostas, configurações e histórico localmente. Continuar?')) return;
    if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
    await this.state.resetAll();
    this.router.navigate(['/boas-vindas']);
  }
}
