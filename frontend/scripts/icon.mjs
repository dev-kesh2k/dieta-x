/**
 * Ícone do app: quadrado arredondado em degradê, prato branco, garfo e faca cruzados.
 * Uso: node scripts/icon.mjs  → gera public/icon.svg e public/icon-<tema>.svg (degradê de cada tema).
 * PNG: scripts/out/*-square.svg → public/icon-<tema>-180.png (iPhone) e icon-192/512.png (verde),
 * renderizados com qualquer navegador headless (ex.: Playwright).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { iconSvg } from '../src/icon-art.js';

export const ICON_COLORS = {
  verde: ['#34d399', '#047857'],
  oceano: ['#38bdf8', '#0369a1'],
  lavanda: ['#a78bfa', '#6d28d9'],
  rosa: ['#ff2d87', '#ff6a3d'],
  escuro: ['#10b981', '#064e3b'],
  noite: ['#818cf8', '#3730a3'],
};

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../public/icon.svg', import.meta.url), iconSvg(ICON_COLORS.verde));
  for (const [id, c] of Object.entries(ICON_COLORS)) {
    writeFileSync(new URL(`../public/icon-${id}.svg`, import.meta.url), iconSvg(c));
    writeFileSync(new URL(`./out/icon-${id}-square.svg`, import.meta.url), iconSvg(c, 'g', true));
  }
}
