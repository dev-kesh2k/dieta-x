/** Temas do app: as cores ficam em index.css (html[data-theme]). Guardado no perfil e no aparelho. */
export const THEMES = [
  { id: 'verde', label: 'Verde', dark: false, swatch: ['#059669', '#f3faf7'], bar: '#f3faf7' },
  { id: 'oceano', label: 'Oceano', dark: false, swatch: ['#0284c7', '#f2f8fc'], bar: '#f2f8fc' },
  { id: 'lavanda', label: 'Lavanda', dark: false, swatch: ['#7c3aed', '#f7f5fd'], bar: '#f7f5fd' },
  { id: 'rosa', label: 'Rosa', dark: false, swatch: ['#db2777', '#fdf4f8'], bar: '#fdf4f8' },
  { id: 'escuro', label: 'Escuro', dark: true, swatch: ['#10b981', '#0b1210'], bar: '#0b1210' },
  { id: 'noite', label: 'Noite', dark: true, swatch: ['#6366f1', '#0b0d17'], bar: '#0b0d17' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];
const KEY = 'dieta-x:theme';

export const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

export function applyTheme(id: string | null | undefined) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  if (theme.id === 'verde') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme.id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bar);
  try {
    localStorage.setItem(KEY, theme.id);
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
}

/** Aplica o último tema do aparelho antes de desenhar a tela (evita piscar no tema padrão). */
export function applySavedTheme() {
  try {
    applyTheme(localStorage.getItem(KEY));
  } catch {
    applyTheme(null);
  }
}

/** Cor do tema atual (ex.: 'brand') para atributos SVG, que não aceitam var(). */
export function themeColor(name: string, alpha = 1) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return v ? `rgb(${v} / ${alpha})` : '';
}
