/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        muted: '#666666',
        faint: '#999999',
        border: '#EEEEEE',
        surface: '#F7F7F7',
        brand: {
          DEFAULT: '#0043CE',
          tint: '#EEF2FF',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
      },
    },
  },
  plugins: [],
};
