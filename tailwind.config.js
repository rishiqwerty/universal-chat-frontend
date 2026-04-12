/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      sans: ['"Inter"', 'sans-serif'],
      headline: ['"Space Grotesk"', 'sans-serif'],
    },
    extend: {
      colors: {
        background: "#0E0E0F",
        sidebar: "#121213",
        surface: "#1A1A1C",
        elevated: "#202124",
        primary: "#D9FF00",
        primaryHover: "#C7F000",
        textPrimary: "#e8ecd5ff",
        textSecondary: "#A1A1AA",
        textMuted: "#71717A",
        border: "#2A2A2D",
        userBubble: "#D9FF0020",
      },
      borderRadius: {
        card: "8px",
        input: "6px",
      },
      accentColor: {
        primary: "#D9FF00",
      },
    },
  },
  plugins: [],
};
