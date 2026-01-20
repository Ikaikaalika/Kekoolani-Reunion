import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './content/**/*.json'
  ],
  theme: {
    extend: {
      colors: {
        brandBlue: '#38bdf8',
        brandBlueDark: '#0ea5e9',
        brandBlueLight: '#7dd3fc',
        brandGreen: '#22c55e',
        brandGreenDark: '#16a34a',
        navy: '#0a2540',
        deep: '#071b31',
        koa: '#64748b',
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e'
        },
        fern: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d'
        },
        lava: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d'
        },
        sand: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917'
        }
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      backgroundImage: {
        kapa: "linear-gradient(135deg, rgba(255,255,255,0.45) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.25) 25%, transparent 25%), linear-gradient(45deg, rgba(255,255,255,0.25) 25%, transparent 25%), linear-gradient(315deg, rgba(255,255,255,0.25) 25%, transparent 25%)"
      },
      backgroundSize: {
        kapa: '40px 40px'
      }
    }
  },
  plugins: []
};

export default config;
