import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        sky: {
          50:  "#f1f6fb",
          100: "#dcebf5",
          200: "#b9d5e8",
          300: "#86b4d3",
          400: "#4b86b2",
          500: "#164b7a",
          600: "#10436d",
          700: "#0b3559",
        },
      },
      boxShadow: {
        sm:  "0 1px 4px rgba(16,67,109,.07), 0 1px 2px rgba(0,0,0,.04)",
        md:  "0 4px 16px rgba(16,67,109,.11), 0 2px 6px rgba(0,0,0,.05)",
        lg:  "0 8px 32px rgba(16,67,109,.15), 0 4px 12px rgba(0,0,0,.06)",
        xl:  "0 20px 60px rgba(16,67,109,.18), 0 8px 24px rgba(0,0,0,.09)",
      },
    },
  },
  plugins: [],
};
export default config;
