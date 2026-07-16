/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#302E2D',
        muted: '#666666',
        faint: '#999999',
        border: '#EEEEEE',
        surface: '#F7F7F7',
        brand: {
          DEFAULT: '#0F62FE',
          tint: '#EDF5FF',
        },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        button: '8px',
      },
    },
  },
  plugins: [],
};
