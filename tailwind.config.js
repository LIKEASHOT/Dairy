/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        claude: {
          bg: '#FAF7F2',
          cream: '#F3EBDD',
          clay: '#C97B63',
          clayLight: '#FAF0ED',
          clayDark: '#A45842',
          sage: '#9EAD90',
          sageLight: '#F2F5F0',
          sageDark: '#5C6B50',
          gold: '#D6B16C',
          goldLight: '#FAF5EB',
          goldDark: '#96742E',
          warmgray: '#A4A09A',
          warmgrayLight: '#F6F5F3',
          warmgrayDark: '#5E5A54',
          darkgray: '#777A80',
          border: '#E8DFD1',
          borderLight: '#F0E9DF',
          card: '#FFFFFF',
          text: '#38332B',
          textMuted: '#847D72',
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif"
        ],
      }
    },
  },
  plugins: [],
}
