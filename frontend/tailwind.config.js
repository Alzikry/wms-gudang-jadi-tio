/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Warna dasar, samain sama tema blueprint (bebas diganti nanti)
        brand: {
          DEFAULT: '#00e5a0',
          dark: '#0f1117',
        },
      },
    },
  },
  plugins: [],
};
