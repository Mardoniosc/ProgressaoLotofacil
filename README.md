# Lotofácil Progressão 

PWA em Angular 22 para **simulação matemática e acompanhamento** de apostas da Lotofácil:
investimento, progressão de jogos, prêmios simulados por faixa, lucro/prejuízo, ROI, ponto de
equilíbrio, banca e histórico. Funciona 100% offline, sem backend — os dados ficam no IndexedDB
do navegador.

> Os valores apresentados são simulações baseadas nas configurações informadas. Resultados reais
> dependem do sorteio e das regras vigentes. Não é uma ferramenta de previsão nem garante prêmio.

## Requisitos

Node.js **22.22.3+ ou 24.15+** (exigência do Angular CLI 22).

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm start` | Servidor de desenvolvimento em http://localhost:4200 (service worker desativado) |
| `npm run build` | Build de produção em `dist/lotofacil-progressao/browser` |
| `npm test` | Testes unitários (Vitest) uma vez |
| `npm run test:watch` | Testes em modo watch |
| `npm run serve:pwa` | Serve o build de produção em http://localhost:8080 (para testar PWA/offline) |
| `npm run icons` | Regenera os ícones PNG e o favicon (script sem dependências) |

## Arquitetura

```
src/app/
  core/
    models/       models.ts (interfaces), defaults.ts (configuração inicial)
    services/     lotofacil-calculation.service.ts (motor de cálculo, funções puras)
                  app-state.service.ts (estado em Signals + persistência)
                  theme.service.ts, pwa.service.ts
    storage/      indexed-db.ts (wrapper Promise), storage.service.ts, backup-validation.ts
    utils/        format.ts (moeda, %, datas, parse "3,50")
  features/
    dashboard/    visão geral, cenário, banca, alerta, simulador
    aposta/       aposta.component.ts, number-grid.component.ts (volante 5×5)
    progressao/   progressao.component.ts, progressao-table.component.ts, progressao-chart.component.ts
    premiacao/    faixas, comportamento proporcional/fixo, nomes personalizados
    historico/    registro, edição e resumo das rodadas
    configuracoes/ banca, tema, exportar/importar JSON, reset
    onboarding/   assistente de primeiro acesso (5 passos)
  shared/
    components/   chart (SVG próprio), money-input, tier-selector, widgets, disclaimer, educational-info
    pipes/        brl, pct, num, pad2, dateBr, jogos
```

- **Standalone components + Signals + OnPush**, aplicação zoneless, rotas com lazy loading.
- `AppStateService` guarda as configurações e o histórico em `signal`s; todos os valores
  derivados (`progressionRows`, `currentRow`, `nextRow`, `bankrollUsage`, `historySummary`…) são
  `computed` que chamam o motor de cálculo. Nenhuma fórmula fica nos componentes.
- Gráficos em SVG próprio (sem bibliotecas), com tooltip e suporte a tema escuro.

## Fórmulas

| Indicador | Fórmula |
| --- | --- |
| Jogos da rodada *n* | `teto(jogosIniciais × fator^(n − 1))` (mínimo 1) |
| Investimento | `jogos × valorDaAposta` |
| Investimento acumulado | `Σ investimento das rodadas 1..n` |
| Prêmio simulado | proporcional: `valorDaFaixa × jogos` · fixo: `valorDaFaixa` |
| Resultado líquido | `prêmio − investimento` (LUCRO > 0, PREJUÍZO < 0, EMPATE = 0) |
| ROI | `((retorno − investimento) / investimento) × 100` (0 se investimento = 0) |
| Ponto de equilíbrio | `investimento` (retorno necessário para recuperá-lo) |
| Banca restante | `bancaInicial − investimentoAcumulado` |
| % da banca utilizado | `investimentoAcumulado / bancaInicial × 100` |

"Investimento" em lucro/ROI/equilíbrio usa, por padrão, o **acumulado** até a rodada (exposição
real da progressão); em Progressão é possível trocar para **investimento da rodada**.
Valores monetários são arredondados para centavos.

## Persistência (IndexedDB)

Banco `lotofacil-progressao`, versão 1:

- store `settings` — uma entrada por grupo: `bet`, `prizes`, `prizeModes`, `tierLabels`,
  `progression`, `bankroll`, `preferences` (inclui `onboardingCompleted`, tema e título).
- store `rounds` — histórico (`keyPath: id`).

Os dados são carregados antes da primeira navegação (`provideAppInitializer`) e cada alteração é
gravada imediatamente. Ao carregar, campos ausentes são completados com os padrões.
**Exportar** gera `lotofacil-progressao-backup.json`; **Importar** valida a estrutura e, após
confirmação, substitui tudo em uma única transação (um arquivo inválido não altera nada).
**Apagar todos os dados** pede confirmação dupla e volta ao assistente inicial.

## PWA — instalar e testar offline

1. `npm run build` e `npm run serve:pwa`.
2. Abra http://localhost:8080 no Chrome/Edge. Use o botão **Instalar** (ou o ícone de instalação da
   barra de endereço). No Android: menu ⋮ → *Instalar app*; no iOS/Safari: Compartilhar →
   *Adicionar à Tela de Início*.
3. Para testar offline: DevTools → Application → Service Workers → *Offline* (ou pare o servidor)
   e recarregue — o app continua abrindo e salvando dados.

Manifesto com ícones `any` e `maskable`, `theme_color`, `background_color` (splash), e atalhos
**Nova aposta** e **Registrar rodada**. O service worker (`@angular/service-worker`) pré-carrega
todos os arquivos e avisa quando há nova versão.

Em produção, o app precisa ser servido via HTTPS (ou localhost) para o service worker funcionar.

## Deploy no GitHub Pages

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) roda a cada push na
branch `main` (ou manualmente em *Actions → Deploy GitHub Pages → Run workflow*): instala as
dependências, executa os testes, gera o build com o `base-href` correto (`/<repositorio>/`, ou `/`
para repositórios `usuario.github.io`), cria o `404.html` de fallback e publica.

Configuração única no GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
O endereço fica `https://<usuario>.github.io/<repositorio>/`.
