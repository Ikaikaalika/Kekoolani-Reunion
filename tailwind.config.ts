import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#ECF9FF',
          100: '#D6F2FF',
          200: '#A8E6FF',
          300: '#7DCFFF',
          400: '#49B6FF',
          500: '#1F9BFF',
          600: '#0C7BD6',
          700: '#0A5EA8',
          800: '#084477',
          900: '#062C4E'
        },
        lava: {
          50: '#ECFFF4',
          100: '#D2FFE5',
          200: '#A6FFCD',
          300: '#73F7AD',
          400: '#3EE58A',
          500: '#16CC6A',
          600: '#0FA957',
          700: '#0D8445',
          800: '#0A6435',
          900: '#074B28'
        },
        fern: {
          50: '#ECFFF4',
          100: '#D2FFE5',
          200: '#A6FFCD',
          300: '#73F7AD',
          400: '#3EE58A',
          500: '#16CC6A',
          600: '#0FA957',
          700: '#0D8445',
          800: '#0A6435',
          900: '#074B28'
        },
        sand: {
          50: '#F3FBFF',
          100: '#E3F6FF',
          200: '#C2EBFF',
          300: '#9BD9FF',
          400: '#64C2FF',
          500: '#3AA7F6',
          600: '#1F86CF',
          700: '#1667A3',
          800: '#104C79',
          900: '#0B3555'
        }
      }
      ,
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui'],
        serif: ['var(--font-noto-serif)', 'Georgia', 'serif']
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
