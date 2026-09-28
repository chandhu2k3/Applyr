import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0F172A",
        graphite: "#1E293B",
        ink: "#090D16",
        canvas: "#F8FAFC",
        hairline: "#E2E8F0",
        hairlineDark: "#CBD5E1",
        cobalt: "#2563EB",
        verified: "#059669",
        attention: "#D97706",
        critical: "#E11D48",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Geist", "system-ui", "sans-serif"],
        mono: ["var(--font-jbmono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        applyx: "6px",
      },
      boxShadow: {
        flyout: "0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
