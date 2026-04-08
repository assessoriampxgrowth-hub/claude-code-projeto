import type { Config } from 'tailwindcss';
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        gold: { 400: '#FFD700', 500: '#FFB800', 600: '#E6A600' },
        dark: { 900: '#050508', 800: '#0A0A0F', 700: '#0F0F1A', 600: '#1A1A2E' }
      },
      fontFamily: { sora: ['Sora', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
