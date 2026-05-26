import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#17120b",
          100: "#241b12",
          200: "#3b2e1f",
          300: "#6b5847",
          900: "#ece0cc",
          950: "#faf3e6",
        },
        accent: {
          DEFAULT: "#d9a85c",
          dark: "#b9863a",
          light: "#f5c97a",
        },
        wine: {
          DEFAULT: "#a14a59",
          dark: "#7c3543",
        },
      },
      fontFamily: {
        serif: ["Fraunces", "Iowan Old Style", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(217,168,92,0.25), 0 12px 40px -12px rgba(217,168,92,0.25)",
        "glow-lg": "0 0 0 1px rgba(217,168,92,0.35), 0 24px 60px -16px rgba(217,168,92,0.45)",
        "glow-wine": "0 0 0 1px rgba(161,74,89,0.35), 0 18px 50px -14px rgba(161,74,89,0.4)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        "mesh-warm":
          "radial-gradient(60% 60% at 30% 30%, rgba(217,168,92,0.35), transparent 60%), radial-gradient(50% 50% at 70% 65%, rgba(161,74,89,0.3), transparent 60%), radial-gradient(40% 60% at 50% 95%, rgba(217,168,92,0.18), transparent 60%)",
        "gold-line":
          "linear-gradient(90deg, transparent, rgba(217,168,92,0.5), transparent)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(217,168,92,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(217,168,92,0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-up-slow": "fade-up 0.8s ease-out both",
        "fade-in": "fade-in 0.6s ease-out both",
        "scale-in": "scale-in 0.25s ease-out both",
        "slide-down": "slide-down 0.25s ease-out both",
        "glow-pulse": "glow-pulse 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
