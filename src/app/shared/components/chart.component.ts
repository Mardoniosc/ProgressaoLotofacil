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
  /** Variável CSS da cor, ex.: "--pri". */
  color: string;
  type: 'bar' | 'line' | 'area' | 'dashed';
}

const PAD = { top: 22, right: 10, bottom: 26, left: 50 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

const short = (v: number) => formatBRL(v, v >= 1000).replace(/,00$/, '');

/**
 * Gráfico SVG leve (sem dependências). Escala linear de propósito: o crescimento
 * exponencial fica evidente. Rodada atual em cor sólida; demais em 35%.
 * Com duas séries (acumulado × prêmio), a zona em que a primeira supera a segunda fica em vermelho.
 */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (series().length > 1) {
      <ul class="legend">
        @for (s of series(); track s.name) {
          <li><i [class]="s.type" [style.--c]="'var(' + s.color + ')'"></i>{{ s.name }}</li>
        }
      </ul>
    }
    <div class="plot" (mouseleave)="hover.set(null)">
      <svg [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="ariaLabel()">
        @if (zone(); as z) {
          <rect class="zone" [attr.x]="z.x" [attr.y]="pad.top" [attr.width]="z.w" [attr.height]="plotH()" />
        }
        @for (t of ticks(); track $index) {
          <line class="grid" [class.base]="$first" [attr.x1]="pad.left" [attr.x2]="width() - pad.right" [attr.y1]="y(t)" [attr.y2]="y(t)" />
          @if (!$first) { <text class="axis" [attr.x]="pad.left - 8" [attr.y]="y(t) + 4" text-anchor="end">{{ fmtShort(t) }}</text> }
        }
        @for (l of labels(); track $index; let i = $index) {
          @if (showLabel(i)) {
            <text class="axis" [class.cur]="i === highlight()" [attr.x]="cx(i)" [attr.y]="height() - 6" text-anchor="middle">{{ l }}</text>
          }
        }
        @if (hover() !== null) {
          <rect class="hover-band" [attr.x]="cx(hover()!) - band() / 2" [attr.y]="pad.top" [attr.width]="band()" [attr.height]="plotH()" rx="6" />
        }
        @for (b of bars(); track b.key) {
          <path [attr.d]="b.d" [style.fill]="'var(' + b.color + ')'" [attr.opacity]="b.dim ? 0.35 : 1" />
          @if (b.label) { <text class="val" [class.cur]="!b.dim" [attr.x]="b.cx" [attr.y]="b.top - 6" text-anchor="middle">{{ b.label }}</text> }
        }
        @for (l of lines(); track l.name) {
          @if (l.area) { <path class="area" [attr.d]="l.area" [style.fill]="'var(' + l.color + ')'" /> }
          <path class="line" [class.dashed]="l.dashed" [attr.d]="l.d" [style.stroke]="'var(' + l.color + ')'" />
          @for (p of l.marks; track $index) {
            <circle class="dot" [attr.cx]="p.x" [attr.cy]="p.y" r="4.5" [style.stroke]="'var(' + l.color + ')'" />
            @if (p.label) { <text class="val" [attr.x]="p.x - 6" [attr.y]="p.y - 10" text-anchor="end">{{ p.label }}</text> }
          }
        }
        @if (zone(); as z) {
          <circle class="cross" [attr.cx]="z.x" [attr.cy]="z.y" r="4.5" />
          <text class="zone-label" [attr.x]="width() - pad.right" [attr.y]="pad.top - 8" text-anchor="end">{{ z.label }}</text>
        }
        @for (l of labels(); track $index; let i = $index) {
          <rect class="hit" [attr.x]="cx(i) - band() / 2" y="0" [attr.width]="band()" [attr.height]="height()" (mouseenter)="hover.set(i)" (click)="hover.set(i)" />
        }
      </svg>
      @if (hover() !== null) {
        <div class="tooltip" [style.left.px]="tooltipX()">
          <strong>{{ xTitle() }} {{ hover()! + 1 }}</strong>
          @for (s of series(); track s.name) {
            <div><i [style.background]="'var(' + s.color + ')'"></i>{{ s.name }} <b>{{ fmt(s.values[hover()!]) }}</b></div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .legend { display: flex; flex-wrap: wrap; gap: 4px 16px; list-style: none; padding: 0; margin: 0 0 10px; font-size: 12.5px; font-weight: 600; color: var(--tx2); }
    .legend li { display: flex; align-items: center; gap: 6px; }
    .legend i { width: 16px; height: 3px; border-radius: 2px; background: var(--c); }
    .legend i.bar { width: 10px; height: 10px; border-radius: 3px; }
    .legend i.dashed { background: repeating-linear-gradient(90deg, var(--c) 0 4px, transparent 4px 7px); }
    .plot { position: relative; width: 100%; }
    svg { display: block; overflow: visible; }
    .grid { stroke: var(--bd); stroke-width: 1; stroke-dasharray: 3 4; }
    .grid.base { stroke-dasharray: none; }
    .axis { fill: var(--tx3); font-size: 10.5px; font-weight: 700; }
    .axis.cur { fill: var(--pri); font-weight: 800; }
    .val { fill: var(--tx2); font-size: 10.5px; font-weight: 800; }
    .val.cur { fill: var(--pri); }
    .line { fill: none; stroke-width: 2.25; stroke-linejoin: round; stroke-linecap: round; }
    .line.dashed { stroke-dasharray: 6 5; stroke-width: 2; }
    .area { opacity: 0.12; }
    .dot { fill: var(--sf); stroke-width: 2; }
    .zone { fill: var(--er); opacity: 0.09; }
    .cross { fill: var(--er); stroke: var(--sf); stroke-width: 2; }
    .zone-label { fill: var(--er); font-size: 11px; font-weight: 800; }
    .hit { fill: transparent; cursor: pointer; }
    .hover-band { fill: var(--tx); opacity: 0.04; }
    .tooltip { position: absolute; top: 0; transform: translateX(-50%); pointer-events: none; z-index: 2;
      background: var(--sf); border: 1px solid var(--bd); border-radius: var(--r-md); box-shadow: var(--sh-elev);
      padding: 8px 12px; font-size: 12.5px; white-space: nowrap; color: var(--tx); }
    .tooltip div { display: flex; align-items: center; gap: 6px; margin-top: 3px; color: var(--tx2); font-weight: 600; }
    .tooltip i { width: 8px; height: 8px; border-radius: 2px; }
    .tooltip b { color: var(--tx); margin-left: auto; padding-left: 10px; font-weight: 800; }
  `,
})
export class ChartComponent {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  /** Índice da rodada atual (cor sólida). */
  readonly highlight = input<number>(-1);
  readonly ariaLabel = input('Gráfico');
  readonly xTitle = input('Rodada');
  /** Rótulo da zona de perigo (quando a série 1 ultrapassa a série 2). */
  readonly zoneLabel = input('investimento supera o prêmio');
  readonly chartHeight = input(220);

  protected readonly pad = PAD;
  protected readonly width = signal(320);
  protected readonly hover = signal<number | null>(null);
  protected readonly height = this.chartHeight;
  protected readonly plotH = computed(() => this.height() - PAD.top - PAD.bottom);

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
  protected readonly ticks = computed(() => [0, 0.5, 1].map((f) => f * this.maxY()));
  protected readonly band = computed(() => (this.width() - PAD.left - PAD.right) / Math.max(1, this.labels().length));

  protected cx(i: number): number {
    return PAD.left + this.band() * (i + 0.5);
  }

  protected y(v: number): number {
    return PAD.top + this.plotH() - (v / this.maxY()) * this.plotH();
  }

  protected showLabel(i: number): boolean {
    const n = this.labels().length;
    const step = Math.ceil(n / Math.max(1, Math.floor((this.width() - PAD.left) / 30)));
    return i % step === 0 || i === n - 1 || i === this.highlight();
  }

  protected readonly bars = computed(() => {
    const barSeries = this.series().filter((s) => s.type === 'bar');
    if (!barSeries.length) return [];
    const gap = 3;
    const group = Math.min(this.band() * 0.72, 44);
    const w = Math.max(3, (group - gap * (barSeries.length - 1)) / barSeries.length);
    const base = this.y(0);
    const n = this.labels().length;
    const hl = this.highlight();
    return barSeries.flatMap((s, si) =>
      s.values.map((v, i) => {
        const x = this.cx(i) - group / 2 + si * (w + gap);
        const top = Math.min(this.y(v), base - 2);
        const h = base - top;
        const r = Math.min(4, w / 2, h);
        const d = `M${x},${base}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${base}Z`;
        const dim = hl >= 0 && i !== hl;
        // rótulos seletivos: rodada atual e as três últimas
        const label = barSeries.length === 1 && (i === hl || i >= n - 3) ? short(v) + (i === hl ? ' · atual' : '') : '';
        return { key: `${s.name}-${i}`, d, color: s.color, dim, label, cx: x + w / 2, top };
      }),
    );
  });

  protected readonly lines = computed(() =>
    this.series()
      .filter((s) => s.type !== 'bar')
      .map((s) => {
        const pts = s.values.map((v, i) => ({ x: this.cx(i), y: this.y(v) }));
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('');
        const area = s.type === 'area' && pts.length
          ? `${d}L${pts[pts.length - 1].x},${this.y(0)}L${pts[0].x},${this.y(0)}Z`
          : '';
        const last = pts.length - 1;
        const marks = s.type === 'area' && this.series().length === 1
          ? [0, Math.max(0, last - 1), last]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((i) => ({ ...pts[i], label: i === 0 ? '' : short(s.values[i]) }))
          : [];
        return { name: s.name, color: s.color, d, area, marks, dashed: s.type === 'dashed' };
      }),
  );

  /** Zona em que a série 1 (acumulado) supera a série 2 (prêmio). */
  protected readonly zone = computed(() => {
    const s = this.series();
    if (s.length !== 2 || s[0].type === 'bar') return null;
    const [a, b] = s;
    const i = a.values.findIndex((v, k) => v > (b.values[k] ?? Infinity));
    if (i < 0) return null;
    const x = i > 0 ? this.cx(i - 1) + this.band() * 0.5 : PAD.left;
    return {
      x,
      w: this.width() - PAD.right - x,
      y: this.y(a.values[i]),
      label: `${this.labels()[i]} · ${this.zoneLabel()}`,
    };
  });

  protected tooltipX(): number {
    const i = this.hover() ?? 0;
    return Math.min(Math.max(this.cx(i), 100), this.width() - 100);
  }

  protected fmt(v: number | undefined): string {
    return formatBRL(v ?? 0);
  }

  protected fmtShort(v: number): string {
    return short(v);
  }
}
