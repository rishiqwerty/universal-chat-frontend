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
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        primaryHover: "rgb(var(--color-primary-hover) / <alpha-value>)",
        textPrimary: "#e8ecd5ff",
        textSecondary: "#A1A1AA",
        textMuted: "#71717A",
        border: "#2A2A2D",
        userBubble: "rgb(var(--color-primary) / 0.12)",
      },
      borderRadius: {
        card: "8px",
        input: "6px",
      },
      accentColor: {
        primary: "rgb(var(--color-primary))",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
