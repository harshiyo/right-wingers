/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#800000',
        'brand-primary-hover': '#a00000',
        'brand-primary-active': '#660000',
        'brand-primary-text': '#FFFFFF',
      },
    },
  },
  plugins: [],
} 