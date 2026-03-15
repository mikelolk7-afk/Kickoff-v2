import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Brand colors (static) */
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        home: "var(--color-home)",
        away: "var(--color-away)",

        /* Semantic surfaces (theme-aware) */
        bg: "var(--color-bg)",
        panel: "var(--color-panel)",
        surface: "var(--color-surface)",
        "surface-hover": "var(--color-surface-hover)",

        /* Semantic text (theme-aware) */
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        subtle: "var(--color-subtle)",

        /* Semantic borders (theme-aware) */
        border: "var(--color-border)",
        "border-light": "var(--color-border-light)",

        /* Input (theme-aware) */
        "input-bg": "var(--color-input-bg)",
        "input-border": "var(--color-input-border)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
