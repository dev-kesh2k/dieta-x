/** @type {import('tailwindcss').Config} */
// Cores em variáveis CSS (canais RGB) para os temas: os valores ficam em src/index.css.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: v('brand'), dark: v('brand-dark'), light: v('brand-light') },
        surface: v('surface'),
        ink: v('ink'),
        soft: v('soft'),
        muted: v('muted'),
        faint: v('faint'),
        line: v('line'),
        line2: v('line2'),
        divider: v('divider'),
        tint: v('tint'),
        track: v('track'),
        bar: v('bar'),
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
