import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        lala: {
          orange: "#F26522",
          orangeHover: "#D95314",
          dark: "#121417",
          card: "#1A1D24",
          cardBorder: "#2A2E39",
          muted: "#9CA3AF",
          accent: "#FF7A00"
        }
      }
    },
  },
  plugins: [],
};
export default config;

