import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'orayn-navy':      '#1B2A4A',
        'orayn-gold':      '#C49A28',
        'orayn-light':     '#EEF2F7',
        'orayn-mid':       '#D0D9E8',
        'orayn-text':      '#1B2A4A',
        'orayn-gray':      '#5A6478',
        'orayn-green':     '#1A6B3C',
        'orayn-green-bg':  '#E6F4EC',
        'orayn-red':       '#8B1A1A',
        'orayn-red-bg':    '#FAE8E8',
        'orayn-amber':     '#7A5200',
        'orayn-amber-bg':  '#FFF3D0',
        'orayn-dark':      '#0F1B2D',
      },
      fontFamily: {
        sora:  ['var(--font-sora)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
        mono:  ['var(--font-jetbrains)', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(27,42,74,0.08)',
        modal: '0 8px 32px rgba(27,42,74,0.18)',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        badge: '4px',
        modal: '16px',
      },
    },
  },
  plugins: [],
}

export default config
