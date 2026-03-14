import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1a7a3c",
        accent: "#f0c040",
        home: "#3a7bd5",
        away: "#d53a3a",
        bg: "#0d0d0f",
        panel: "#13141a",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
