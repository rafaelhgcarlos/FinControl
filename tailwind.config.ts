import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "hsl(var(--fc-canvas) / <alpha-value>)",
        surface: "hsl(var(--fc-surface) / <alpha-value>)",
        "surface-subtle": "hsl(var(--fc-surface-subtle) / <alpha-value>)",
        foreground: "hsl(var(--fc-foreground) / <alpha-value>)",
        "muted-foreground": "hsl(var(--fc-muted-foreground) / <alpha-value>)",
        border: "hsl(var(--fc-border) / <alpha-value>)",
        primary: "hsl(var(--fc-primary) / <alpha-value>)",
        "primary-foreground": "hsl(var(--fc-primary-foreground) / <alpha-value>)",
        success: "hsl(var(--fc-success) / <alpha-value>)",
        warning: "hsl(var(--fc-warning) / <alpha-value>)",
        danger: "hsl(var(--fc-danger) / <alpha-value>)",
        info: "hsl(var(--fc-info) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: { control: "var(--fc-radius-control)", surface: "var(--fc-radius-surface)" },
      boxShadow: { surface: "var(--fc-shadow-surface)", overlay: "var(--fc-shadow-overlay)" },
    },
  },
  plugins: [],
} satisfies Config;
