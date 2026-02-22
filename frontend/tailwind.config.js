/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        sepia: {
          bg: '#f0e6d2',
          text: '#5b4636',
        },
        green: {
          bg: '#edf7ed',
          text: '#2d5a2d',
        },
      },
    },
  },
  plugins: [],
}
