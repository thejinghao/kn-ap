/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // HTTP Method colors (text)
        'method-get': '#2563EB',
        'method-post': '#16A34A',
        'method-patch': '#CA8A04',
        'method-put': '#CA8A04',
        'method-delete': '#DC2626',
        // Klarna brand colors
        'klarna-pink': '#EC4899',
        'klarna-pink-dark': '#DB2777',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      maxWidth: {
        '5xl': '1024px',
      },
    },
  },
  plugins: [],
};
