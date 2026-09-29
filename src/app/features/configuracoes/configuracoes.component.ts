import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppStateService } from '../../core/services/app-state.service';
import { ThemeService } from '../../core/services/theme.service';
import { PwaService } from '../../core/services/pwa.service';
import { UiService } from '../../core/services/ui.service';
import { BackupValidationError } from '../../core/storage/backup-validation';
import { MAX_PROGRESSION_ROUNDS } from '../../core/models/defaults';
import { ThemePreference } from '../../core/models/models';
import { BrlPipe } from '../../shared/pipes/format.pipes';
import { MoneyInputComponent } from '../../shared/components/money-input.component';
import { DisclaimerComponent } from '../../shared/components/disclaimer.component';
import { IconComponent } from '../../shared/components/icon.component';
import { SheetComponent } from '../../shared/components/sheet.component';

export const BACKUP_FILENAME = 'lotofacil-progressao-backup.json';

type EditKey = 'multiplier' | 'initialGames' | 'rounds' | 'initialBankroll' | 'maxRoundInvestment' | 'appTitle';

interface EditState {
  key: EditKey;
  title: string;
  kind: 'money' | 'int' | 'decimal' | 'text';
  value: number | string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}

@Component({
  selector: 'app-configuracoes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BrlPipe, MoneyInputComponent, DisclaimerComponent, IconComponent, SheetComponent],
  templateUrl: './configuracoes.component.html',
  styles: `
    .layout { display: grid; gap: 8px; align-items: start; }
    @media (min-width: 1024px) { .layout { grid-template-columns: 1fr 1fr; gap: 24px; } }
    .col { display: flex; flex-direction: column; gap: 8px; }
    .col .overline { margin-top: 12px; padding-left: 4px; }
    .list-row app-icon.lead { color: var(--tx2); }
    .list-row.danger app-icon.lead { color: var(--er); }
    .theme { padding: 6px; }
    .explain { display: flex; justify-content: space-between; align-items: center; width: 100%; min-height: 56px; padding: 0 16px; margin-top: 12px;
      border: 1.5px dashed var(--bd); border-radius: var(--r-lg); background: transparent; font: inherit; font-size: 15px; font-weight: 700; color: var(--tx); cursor: pointer; }
    .explain span { color: var(--pri); display: inline-flex; align-items: center; gap: 2px; }
    .status { font-size: 12.5px; color: var(--tx3); font-weight: 600; padding: 4px; }
  `,
})
export class ConfiguracoesComponent {
  protected readonly state = inject(AppStateService);
  protected readonly theme = inject(ThemeService);
  protected readonly pwa = inject(PwaService);
  protected readonly ui = inject(UiService);
  private readonly router = inject(Router);

  protected readonly message = signal<{ text: string; error: boolean } | null>(null);
  protected readonly storageInfo = signal<string | null>(null);
  protected readonly editing = signal<EditState | null>(null);
  protected readonly themes: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'Sistema', icon: 'monitor' },
  ];

  constructor() {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    // Pede ao navegador para não descartar os dados locais automaticamente.
    storage?.persist?.().then((persisted) =>
      this.storageInfo.set(persisted ? 'persistente' : 'padrão do navegador'),
    ).catch(() => undefined);
  }

  protected fmtMultiplier(): string {
    return `${this.state.progression().multiplier.toString().replace('.', ',')}x`;
  }

  protected edit(key: EditKey): void {
    const p = this.state.progression();
    const b = this.state.bankroll();
    const map: Record<EditKey, EditState> = {
      multiplier: { key, title: 'Multiplicador', kind: 'decimal', value: p.multiplier, min: 1, max: 10, step: 0.1, hint: 'Fator aplicado à quantidade de jogos a cada rodada (padrão 2x).' },
      initialGames: { key, title: 'Número inicial de jogos', kind: 'int', value: p.initialGames, min: 1, max: 10000, step: 1 },
      rounds: { key, title: 'Número de rodadas', kind: 'int', value: p.rounds, min: 1, max: MAX_PROGRESSION_ROUNDS, step: 1, hint: `Quantidade de rodadas exibidas na tabela (até ${MAX_PROGRESSION_ROUNDS}).` },
      initialBankroll: { key, title: 'Banca inicial', kind: 'money', value: b.initialBankroll },
      maxRoundInvestment: { key, title: 'Limite máximo por rodada', kind: 'money', value: b.maxRoundInvestment ?? 0, hint: 'Use 0 para desativar o alerta de limite.' },
      appTitle: { key, title: 'Nome do aplicativo', kind: 'text', value: this.state.preferences().appTitle, hint: 'Ex.: "Minha estratégia" ou "Progressão Lotofácil".' },
    };
    this.editing.set(map[key]);
  }

  protected setDraft(value: number | string): void {
    this.editing.update((e) => (e ? { ...e, value } : e));
  }

  protected stepDraft(dir: 1 | -1): void {
    const e = this.editing();
    if (!e || typeof e.value !== 'number') return;
    const next = Math.round((e.value + dir * (e.step ?? 1)) * 100) / 100;
    this.setDraft(Math.min(e.max ?? Infinity, Math.max(e.min ?? 0, next)));
  }

  protected saveEdit(): void {
    const e = this.editing();
    if (!e) return;
    const num = typeof e.value === 'number' ? e.value : Number(e.value);
    const clamp = (n: number) => Math.min(e.max ?? Infinity, Math.max(e.min ?? 0, n));
    switch (e.key) {
      case 'multiplier':
        if (Number.isFinite(num)) this.state.update('progression', { multiplier: clamp(Math.round(num * 100) / 100) });
        break;
      case 'initialGames':
        if (Number.isFinite(num)) this.state.update('progression', { initialGames: clamp(Math.round(num)) });
        break;
      case 'rounds': {
        if (!Number.isFinite(num)) break;
        const rounds = clamp(Math.round(num));
        this.state.update('progression', { rounds, currentRound: Math.min(this.state.progression().currentRound, rounds) });
        break;
      }
      case 'initialBankroll':
        this.state.update('bankroll', { initialBankroll: Math.max(0, num) });
        break;
      case 'maxRoundInvestment':
        this.state.update('bankroll', { maxRoundInvestment: Math.max(0, num) });
        break;
      case 'appTitle':
        this.state.update('preferences', { appTitle: String(e.value).trim() || 'Lotofácil Progressão' });
        break;
    }
    this.editing.set(null);
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
      const ok = await this.ui.confirm({
        title: 'Importar dados?',
        message: 'A importação substituirá os dados atuais. Deseja continuar?',
        confirmText: 'Importar',
        tone: 'dark',
        icon: 'download',
      });
      if (!ok) return;
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

  protected async restoreInitial(): Promise<void> {
    const ok = await this.ui.confirm({
      title: 'Restaurar configuração inicial?',
      message: 'Valor da aposta, premiações, progressão e banca voltam para os valores iniciais. Seus números e histórico são mantidos.',
      confirmText: 'Restaurar',
      tone: 'dark',
      icon: 'refresh',
    });
    if (ok) {
      this.state.restoreInitialConfiguration();
      this.message.set({ text: 'Configuração inicial restaurada.', error: false });
    }
  }

  protected rerunOnboarding(): void {
    this.state.update('preferences', { onboardingCompleted: false });
    this.router.navigate(['/boas-vindas']);
  }

  protected async resetAll(): Promise<void> {
    const first = await this.ui.confirm({
      title: 'Apagar todos os dados?',
      message: 'Essa ação apagará suas apostas, configurações e histórico localmente.',
      confirmText: 'Continuar',
      tone: 'danger',
      icon: 'trash',
    });
    if (!first) return;
    const second = await this.ui.confirm({
      title: 'Tem certeza?',
      message: 'Esta ação não pode ser desfeita. Considere exportar um backup antes.',
      confirmText: 'Apagar tudo',
      tone: 'danger',
      icon: 'alert',
    });
    if (!second) return;
    await this.state.resetAll();
    this.router.navigate(['/boas-vindas']);
  }
}
