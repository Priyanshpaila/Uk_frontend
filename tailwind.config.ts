import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      fontSize: {
        fluid: ['clamp(1rem, 1vw + 0.75rem, 1.125rem)', { lineHeight: '1.6' }],
        h1: ['clamp(2rem, 3.5vw, 3rem)', { lineHeight: '1.1' }],
        h2: ['clamp(1.5rem, 2.5vw, 2.25rem)', { lineHeight: '1.15' }],
      },
    },
  },
  plugins: [],
} satisfies Config