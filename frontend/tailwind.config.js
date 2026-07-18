/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0E6B5C',
          dark: '#0A4F44',
          light: '#3E8F73',
        },
        gold: {
          DEFAULT: '#B08D57',
        },
        ink: {
          DEFAULT: '#20242E',
          soft: '#5B6472',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
