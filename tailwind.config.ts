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
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
      },
      boxShadow: {
        sm:  "0 1px 4px rgba(14,165,233,.07), 0 1px 2px rgba(0,0,0,.04)",
        md:  "0 4px 16px rgba(14,165,233,.11), 0 2px 6px rgba(0,0,0,.05)",
        lg:  "0 8px 32px rgba(14,165,233,.15), 0 4px 12px rgba(0,0,0,.06)",
        xl:  "0 20px 60px rgba(14,165,233,.18), 0 8px 24px rgba(0,0,0,.09)",
      },
    },
  },
  plugins: [],
};
export default config;
