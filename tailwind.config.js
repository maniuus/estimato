/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F9F9F8',
          100: '#EAEAEA',
          200: '#D4D4D8',
          300: '#A1A1AA',
          400: '#71717A',
          500: '#2F3437',
          600: '#111111',
          700: '#09090B',
          800: '#000000',
          900: '#000000',
          950: '#000000'
        },
        slate: {
          850: '#1E293B',
          950: '#0F172A'
        }
      },
      fontFamily: {
        sans: ['Geist', 'SF Pro Display', 'Helvetica Neue', 'Switzer', 'sans-serif'],
        serif: ['Instrument Serif', 'Playfair Display', 'serif'],
        mono: ['Geist Mono', 'SF Mono', 'JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
}
