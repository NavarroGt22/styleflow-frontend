/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3C3489',
          light: '#EEEDFE',
          dark: '#2A2362',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F9FA',
          border: '#E9ECEF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
