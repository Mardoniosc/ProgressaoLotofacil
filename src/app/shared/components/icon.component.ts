import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Ícones de traço (24×24, stroke 2) usados em todo o app. */
const ICONS: Record<string, string> = {
  home: 'M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 19z',
  ticket: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5zM14 6v2.5M14 11v2M14 15.5V18',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  sliders: 'M4 7h9M17 7h3M15 5v4M4 12h3M11 12h9M9 10v4M4 17h11M19 17h1M17 15v4',
  trophy: 'M8 21h8M12 16.5V21M7 4h10v5a5 5 0 0 1-10 0zM17 5.5h2.5v1.5A3 3 0 0 1 17 10M7 5.5H4.5V7A3 3 0 0 0 7 10',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16v-4.5M12 8h.01',
  pencil: 'M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16zM13.5 6.5l4 4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  'check-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.5l2.7 2.7L16 10',
  x: 'M6 6l12 12M18 6 6 18',
  'x-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5h6V7',
  shield: 'M12 3l7.5 3v5.5c0 4.7-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.8-7.5-9.5V6z',
  'shield-check': 'M12 3l7.5 3v5.5c0 4.7-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.8-7.5-9.5V6zM9 12l2.2 2.2L15.5 10',
  alert: 'M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0zM12 9.5v4M12 17h.01',
  'chevron-right': 'M9 5.5l6.5 6.5L9 18.5',
  'chevron-left': 'M15 5.5 8.5 12l6.5 6.5',
  'chevron-down': 'M5.5 9l6.5 6.5L18.5 9',
  upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15',
  download: 'M12 4v11M7.5 10.5 12 15l4.5-4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
  moon: 'M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2z',
  monitor: 'M3.5 5.5A1.5 1.5 0 0 1 5 4h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 16H5a1.5 1.5 0 0 1-1.5-1.5zM8.5 20h7M12 16v4',
  refresh: 'M20 12a8 8 0 1 1-2.4-5.7M20 4.5V9h-4.5',
  'arrow-up': 'M12 19V5M6.5 10.5 12 5l5.5 5.5',
  'arrow-down': 'M12 5v14M6.5 13.5 12 19l5.5-5.5',
  'arrow-right': 'M5 12h14M13.5 6.5 19 12l-5.5 5.5',
  install: 'M12 3.5v11M7.5 10 12 14.5 16.5 10M5 20.5h14',
  book: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z',
  wallet: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3M4 7.5v10A2.5 2.5 0 0 0 6.5 20H20v-4M4 7.5A2.5 2.5 0 0 0 6.5 10H20v6M16.5 13h.01',
  calendar: 'M5 5.5h14A1.5 1.5 0 0 1 20.5 7v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5zM3.5 10h17M8 3.5v4M16 3.5v4',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `:host { display: inline-flex; line-height: 0; }`,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(20);
  readonly stroke = input(2);
  protected readonly path = computed(() => ICONS[this.name()] ?? '');
}

/** Logo: quadrado azul com volante 3×3. */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--pri)" />
      <g fill="var(--on-pri)">
        <circle cx="12.5" cy="12.5" r="2.6" /><circle cx="20" cy="12.5" r="2.6" opacity=".45" /><circle cx="27.5" cy="12.5" r="2.6" />
        <circle cx="12.5" cy="20" r="2.6" opacity=".45" /><circle cx="20" cy="20" r="2.6" /><circle cx="27.5" cy="20" r="2.6" />
        <circle cx="12.5" cy="27.5" r="2.6" /><circle cx="20" cy="27.5" r="2.6" /><circle cx="27.5" cy="27.5" r="2.6" opacity=".45" />
      </g>
    </svg>
  `,
  styles: `:host { display: inline-flex; line-height: 0; }`,
})
export class LogoComponent {
  readonly size = input(36);
}
