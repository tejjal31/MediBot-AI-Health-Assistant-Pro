/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd2ff',
          300: '#8eb3ff',
          400: '#5888f5',
          500: '#3366e6',
          600: '#234dc4',
          700: '#1c3c9a',
          800: '#16285f',
          900: '#0c1b3d',
          950: '#060f24',
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(34,211,238,0.35)',
      },
    },
  },
  plugins: [],
};
