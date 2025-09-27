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
          50: '#EFF8FF',
          100: '#D7EEFF',
          200: '#B0DCFF',
          300: '#7AC1FF',
          400: '#3AA1F6',
          500: '#0076D6',
          600: '#005AB0',
          700: '#004591',
          800: '#003373',
          900: '#00295D'
        },
        lava: {
          50: '#FFF4F2',
          100: '#FFE2DC',
          200: '#FFC3B5',
          300: '#FF9D88',
          400: '#FF7058',
          500: '#FF4A30',
          600: '#E0391E',
          700: '#B52A15',
          800: '#8C2011',
          900: '#6F170D'
        },
        fern: {
          50: '#F2FDF7',
          100: '#D8F8E5',
          200: '#B0EFCB',
          300: '#7CE3AC',
          400: '#40D085',
          500: '#1AA961',
          600: '#11854D',
          700: '#0E6A3E',
          800: '#0B5130',
          900: '#083D25'
        },
        sand: {
          50: '#FFFBF2',
          100: '#FFF2D9',
          200: '#FFE0A8',
          300: '#FFCA6B',
          400: '#FFB338',
          500: '#FF9900',
          600: '#D67B00',
          700: '#A55C00',
          800: '#7C4400',
          900: '#5F3300'
        }
      }
    }
  },
  plugins: []
};

export default config;
