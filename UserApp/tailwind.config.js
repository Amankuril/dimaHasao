/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.jsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Ported from Frontend/src/shared/styles/global.css (oklch -> hex,
        // the app is light-only there too, so only one palette is kept).
        background: '#ffffff',
        foreground: '#270e01',
        card: '#ffffff',
        'card-foreground': '#270e01',
        popover: '#ffffff',
        'popover-foreground': '#270e01',
        primary: '#c99500',
        'primary-foreground': '#1b0400',
        secondary: '#f4eee0',
        'secondary-foreground': '#4a2200',
        muted: '#f4f2ea',
        'muted-foreground': '#7b5b4a',
        accent: '#ffdea9',
        'accent-foreground': '#371801',
        destructive: '#e7000b',
        border: '#e4ddcf',
        input: '#f1eee7',
        ring: '#c99500',
      },
      fontFamily: {
        poppins: ['Poppins'],
        outfit: ['Outfit'],
      },
      borderRadius: {
        sm: 6,
        md: 8,
        lg: 10,
        xl: 14,
      },
    },
  },
  plugins: [],
};
