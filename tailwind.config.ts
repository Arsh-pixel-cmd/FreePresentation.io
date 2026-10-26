import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["var(--font-dm-serif)", "Georgia", "serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        surface: {
          DEFAULT: "#080808",
          raised: "#0c0c0c",
          overlay: "#0a0a0a",
          subtle: "#0d0d0d",
          border: "#141414",
          "border-light": "#1a1a1a",
          "border-hover": "#2a2a2a",
        },
        cream: {
          DEFAULT: "#e8e4dc",
          light: "#f5f5f5",
        },
        indigo: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          muted: "rgba(99, 102, 241, 0.3)",
          subtle: "rgba(99, 102, 241, 0.1)",
          faint: "rgba(99, 102, 241, 0.04)",
        },
      },
      letterSpacing: {
        widest: "0.2em",
        wider: "0.15em",
        wide: "0.08em",
      },
      animation: {
        "spin-slow": "spin 1.2s linear infinite",
        "spin-reverse": "spin 0.8s linear infinite reverse",
        "slide-up": "slideUp 0.25s ease",
        "toast-in": "toastIn 0.25s ease",
        "word-fade": "wordFade 0.4s ease",
        marquee: "marquee 30s linear infinite",
        "scroll-line": "scrollLine 2s ease infinite",
      },
      keyframes: {
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        toastIn: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        wordFade: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        scrollLine: {
          "0%": { left: "-100%" },
          "50%": { left: "0%" },
          "100%": { left: "100%" },
        },
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    plugin(({ addVariant }) => {
      addVariant("data-open", [
        "&:where([data-state=open])",
        "&:where([data-open]:not([data-open=false]))",
      ]);
      addVariant("data-closed", [
        "&:where([data-state=closed])",
        "&:where([data-closed]:not([data-closed=false]))",
      ]);
      addVariant("data-checked", [
        "&:where([data-state=checked])",
        "&:where([data-checked]:not([data-checked=false]))",
      ]);
      addVariant("data-unchecked", [
        "&:where([data-state=unchecked])",
        "&:where([data-unchecked]:not([data-unchecked=false]))",
      ]);
      addVariant("data-selected", ["&:where([data-selected=true])"]);
      addVariant("data-disabled", [
        "&:where([data-disabled=true])",
        "&:where([data-disabled]:not([data-disabled=false]))",
      ]);
      addVariant("data-active", [
        "&:where([data-state=active])",
        "&:where([data-active]:not([data-active=false]))",
      ]);
      addVariant("data-horizontal", ["&:where([data-orientation=horizontal])"]);
      addVariant("data-vertical", ["&:where([data-orientation=vertical])"]);
    }),
  ],
};

export default config;
