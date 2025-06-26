/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"  // ✅ Ensure Tailwind detects JSX files
  ],
  darkMode: 'class', // Enable dark mode
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#60a5fa',
          DEFAULT: '#3b82f6',
          dark: '#1e40af',
        },
        background: {
          light: '#f8fafc',
          dark: '#1e293b',
        },
      },
    },
  },
  plugins: [],
};
