import type { Config } from "tailwindcss";

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        selected: { DEFAULT: token("selected"), foreground: token("selected-foreground") },
        count: { DEFAULT: token("count"), foreground: token("count-foreground") },
        "neutral-tag": token("neutral-tag"),
        "pill-inactive": token("pill-inactive"),
        positive: { DEFAULT: token("positive"), bg: token("positive-bg") },
        negative: { DEFAULT: token("negative"), bg: token("negative-bg") },
        warning: { DEFAULT: token("warning"), bg: token("warning-bg") },
        destructive: token("destructive"),
        chart: {
          current: token("chart-current"),
          previous: token("chart-previous"),
          partial: token("chart-partial"),
        },
        brand: { blue: "#3336FD", green: "#36D97A", yellow: "#FEBC17" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
      },
    },
  },
  plugins: [],
};

export default config;
