import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    { pattern: /^(text|bg|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900)$/ },
  ],
  theme: {
    extend: {
      colors: {
        // Accent driven by CSS variable so TweaksPanel can swap it at runtime.
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          fg: "rgb(var(--accent-fg-rgb) / <alpha-value>)",
          dim: "rgb(var(--accent-rgb) / 0.14)",
        },
        success: "rgb(var(--success-rgb) / <alpha-value>)",
        // Surface tokens for the dark glass aesthetic (still respect dark: variants).
        scene: "rgb(var(--scene-rgb) / <alpha-value>)",
      },
      boxShadow: {
        "glass": "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 10px 30px -12px rgba(0,0,0,0.55)",
        "accent-glow": "0 0 0 1px rgb(var(--accent-rgb) / 0.55), 0 12px 28px -8px rgb(var(--accent-rgb) / 0.45)",
      },
      backdropBlur: {
        xs: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
