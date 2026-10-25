/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          DEFAULT: '#142B4A',
          50: '#F0F5FA',
          100: '#E1EBF5',
          200: '#C2D7EC',
          300: '#8FB8DC',
          400: '#5291C7',
          500: '#2E71AB',
          600: '#1F5385',
          700: '#183F66',
          800: '#142B4A',
          900: '#0E1F35',
          950: '#081220'
        },
        teal: {
          deep: '#236D78',
          soft: '#4BC7BE',
          50: '#F0FDFB',
          100: '#CCFBF7',
          200: '#99F6EE',
          300: '#5EEADF',
          400: '#4BC7BE',
          500: '#236D78',
          600: '#1C5760',
          700: '#17474E',
          800: '#13393E',
          900: '#0F2C30'
        },
        offwhite: '#F4F7FA'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
