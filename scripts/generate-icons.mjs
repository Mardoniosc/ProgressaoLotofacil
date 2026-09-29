// Gera os ícones PNG do PWA (sem dependências): fundo violeta com um volante 5×5.
// Uso: node scripts/generate-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SELECTED = new Set([1, 3, 4, 6, 7, 9, 11, 13, 15, 17, 18, 20, 21, 23, 25]);
const BG_TOP = [124, 58, 237];
const BG_BOTTOM = [91, 33, 182];
const WHITE = [255, 255, 255];
const DIM = [255, 255, 255, 0.28];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Cobertura (0..1) com antialiasing por supersampling 4×4. */
function coverage(size, px, py, inside) {
  let hits = 0;
  for (let sy = 0; sy < 4; sy++)
    for (let sx = 0; sx < 4; sx++) if (inside((px + (sx + 0.5) / 4) / size, (py + (sy + 0.5) / 4) / size)) hits++;
  return hits / 16;
}

function roundedRect(r) {
  return (x, y) => {
    const cx = Math.min(Math.max(x, r), 1 - r);
    const cy = Math.min(Math.max(y, r), 1 - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
}

/**
 * maskable: fundo preenche tudo e o conteúdo fica na "safe zone" (80%).
 * any: cantos arredondados transparentes.
 */
function render(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const shape = maskable ? () => true : roundedRect(0.22);
  const gridScale = maskable ? 0.56 : 0.7;
  const origin = (1 - gridScale) / 2;
  const cell = gridScale / 5;
  const radius = cell * 0.36;
  const balls = [];
  for (let i = 0; i < 25; i++) {
    balls.push({ cx: origin + cell * (i % 5 + 0.5), cy: origin + cell * (Math.floor(i / 5) + 0.5), on: SELECTED.has(i + 1) });
  }
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const a = coverage(size, px, py, shape);
      const t = py / size;
      let col = BG_TOP.map((c, k) => c + (BG_BOTTOM[k] - c) * t);
      const x = (px + 0.5) / size, y = (py + 0.5) / size;
      for (const b of balls) {
        if (Math.abs(x - b.cx) > cell / 2 || Math.abs(y - b.cy) > cell / 2) continue;
        const cov = coverage(size, px, py, (u, v) => (u - b.cx) ** 2 + (v - b.cy) ** 2 <= radius * radius);
        if (cov > 0) {
          const [r, g, bl, alpha = 1] = b.on ? WHITE : DIM;
          const m = cov * alpha;
          col = [col[0] + (r - col[0]) * m, col[1] + (g - col[1]) * m, col[2] + (bl - col[2]) * m];
        }
      }
      const o = (py * size + px) * 4;
      buf[o] = Math.round(col[0]); buf[o + 1] = Math.round(col[1]); buf[o + 2] = Math.round(col[2]);
      buf[o + 3] = Math.round(a * 255);
    }
  }
  return png(size, buf);
}

mkdirSync('public/icons', { recursive: true });
for (const s of [72, 96, 128, 144, 152, 192, 384, 512]) writeFileSync(`public/icons/icon-${s}x${s}.png`, render(s, false));
for (const s of [192, 512]) writeFileSync(`public/icons/maskable-${s}x${s}.png`, render(s, true));
writeFileSync('public/icons/apple-touch-icon.png', render(180, true));
writeFileSync('public/icons/shortcut-aposta-96x96.png', render(96, true));

// favicon.ico com um PNG 48×48 embutido
const fav = render(48, false);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header[6] = 48; header[7] = 48; header[8] = 0; header[9] = 0;
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(fav.length, 14); header.writeUInt32LE(22, 18);
writeFileSync('public/favicon.ico', Buffer.concat([header, fav]));
console.log('Ícones gerados em public/icons');
