import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { formatBRL } from '../../core/utils/format';

export interface ChartSeries {
  name: string;
  values: number[];
  /** Variável CSS da cor da série, ex.: "--series-1". */
  color: string;
  type: 'bar' | 'line';
}

const PAD = { top: 16, right: 12, bottom: 28, left: 64 };
const HEIGHT = 240;

/** Arredonda o topo do eixo Y para um valor "bonito". */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Gráfico SVG leve (barras e/ou linhas) sem dependências externas, com tooltip. */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (series().length > 1) {
      <ul class="legend" aria-hidden="true">
        @for (s of series(); track s.name) {
          <li><span class="swatch" [class.line]="s.type === 'line'" [style.background]="'var(' + s.color + ')'"></span>{{ s.name }}</li>
        }
      </ul>
    }
    <div class="plot" (mouseleave)="hover.set(null)">
      <svg [attr.width]="width()" [attr.height]="height" role="img" [attr.aria-label]="ariaLabel()">
        @for (t of ticks(); track $index) {
          <line class="grid" [attr.x1]="pad.left" [attr.x2]="width() - pad.right" [attr.y1]="y(t)" [attr.y2]="y(t)" />
          <text class="axis" [attr.x]="pad.left - 8" [attr.y]="y(t) + 4" text-anchor="end">{{ fmtAxis(t) }}</text>
        }
        @for (l of labels(); track $index; let i = $index) {
          @if (showLabel(i)) {
            <text class="axis" [attr.x]="cx(i)" [attr.y]="height - 8" text-anchor="middle">{{ l }}</text>
          }
        }
        @if (hover() !== null) {
          <rect class="hover-band" [attr.x]="cx(hover()!) - band() / 2" [attr.y]="pad.top" [attr.width]="band()" [attr.height]="plotH" />
        }
        @for (b of bars(); track b.key) {
          <path [attr.d]="b.d" [style.fill]="'var(' + b.color + ')'" />
        }
        @for (l of lines(); track l.name) {
          <path class="line" [attr.d]="l.d" [style.stroke]="'var(' + l.color + ')'" />
          @for (p of l.points; track $index) {
            <circle class="dot" [attr.cx]="p.x" [attr.cy]="p.y" r="4" [style.fill]="'var(' + l.color + ')'" />
          }
        }
        @for (l of labels(); track $index; let i = $index) {
          <rect class="hit" [attr.x]="cx(i) - band() / 2" [attr.y]="0" [attr.width]="band()" [attr.height]="height"
            (mouseenter)="hover.set(i)" (click)="hover.set(i)" />
        }
      </svg>
      @if (hover() !== null) {
        <div class="tooltip" [style.left.px]="tooltipX()">
          <strong>{{ xTitle() }} {{ labels()[hover()!] }}</strong>
          @for (s of series(); track s.name) {
            <div><span class="swatch" [style.background]="'var(' + s.color + ')'"></span>{{ s.name }}: <b>{{ fmt(s.values[hover()!]) }}</b></div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .legend { display: flex; flex-wrap: wrap; gap: 4px 16px; list-style: none; padding: 0; margin: 0 0 8px; font-size: 0.8rem; color: var(--text-2); }
    .legend li { display: flex; align-items: center; gap: 6px; }
    .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; }
    .swatch.line { height: 3px; width: 14px; border-radius: 2px; }
    .plot { position: relative; width: 100%; }
    svg { display: block; overflow: visible; }
    .grid { stroke: var(--border); stroke-width: 1; }
    .axis { fill: var(--text-3); font-size: 11px; font-variant-numeric: tabular-nums; }
    .line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .dot { stroke: var(--surface); stroke-width: 2; }
    .hit { fill: transparent; cursor: pointer; }
    .hover-band { fill: var(--text-1); opacity: 0.05; }
    .tooltip {
      position: absolute; top: 4px; transform: translateX(-50%); pointer-events: none;
      background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
      box-shadow: var(--shadow); padding: 6px 10px; font-size: 0.78rem; white-space: nowrap; color: var(--text-1);
    }
    .tooltip div { display: flex; align-items: center; margin-top: 2px; color: var(--text-2); }
    .tooltip b { color: var(--text-1); margin-left: 4px; font-variant-numeric: tabular-nums; }
  `,
})
export class ChartComponent {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly ariaLabel = input('Gráfico');
  readonly xTitle = input('Rodada');

  protected readonly pad = PAD;
  protected readonly height = HEIGHT;
  protected readonly plotH = HEIGHT - PAD.top - PAD.bottom;
  protected readonly width = signal(320);
  protected readonly hover = signal<number | null>(null);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const measure = () => this.width.set(Math.max(240, Math.floor(this.el.nativeElement.clientWidth)));
      measure();
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(measure);
        ro.observe(this.el.nativeElement);
        destroyRef.onDestroy(() => ro.disconnect());
      }
    });
  }

  private readonly maxY = computed(() => niceMax(Math.max(0, ...this.series().flatMap((s) => s.values))));
  protected readonly ticks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => f * this.maxY()));
  protected readonly band = computed(() => (this.width() - PAD.left - PAD.right) / Math.max(1, this.labels().length));

  protected cx(i: number): number {
    return PAD.left + this.band() * (i + 0.5);
  }

  protected y(v: number): number {
    return PAD.top + this.plotH - (v / this.maxY()) * this.plotH;
  }

  protected showLabel(i: number): boolean {
    const n = this.labels().length;
    const step = Math.ceil(n / Math.max(1, Math.floor((this.width() - PAD.left) / 28)));
    return i % step === 0 || i === n - 1;
  }

  protected readonly bars = computed(() => {
    const barSeries = this.series().filter((s) => s.type === 'bar');
    if (!barSeries.length) return [];
    const gap = 2;
    const group = Math.min(this.band() * 0.7, 56);
    const w = Math.max(2, (group - gap * (barSeries.length - 1)) / barSeries.length);
    const base = this.y(0);
    return barSeries.flatMap((s, si) =>
      s.values.map((v, i) => {
        const x = this.cx(i) - group / 2 + si * (w + gap);
        const top = this.y(v);
        const h = base - top;
        const r = Math.min(4, w / 2, h);
        // topo arredondado, base reta ancorada no eixo
        const d = h <= 0.5
          ? ''
          : `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
        return { key: `${s.name}-${i}`, d, color: s.color };
      }),
    );
  });

  protected readonly lines = computed(() =>
    this.series()
      .filter((s) => s.type === 'line')
      .map((s) => {
        const points = s.values.map((v, i) => ({ x: this.cx(i), y: this.y(v) }));
        return { name: s.name, color: s.color, points, d: points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('') };
      }),
  );

  protected tooltipX(): number {
    const i = this.hover() ?? 0;
    return Math.min(Math.max(this.cx(i), 90), this.width() - 90);
  }

  protected fmt(v: number | undefined): string {
    return formatBRL(v ?? 0);
  }

  protected fmtAxis(v: number): string {
    return formatBRL(v, v >= 10_000);
  }
}
