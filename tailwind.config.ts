import type { Config } from "tailwindcss";

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
  plugins: [],
};

export default config;
