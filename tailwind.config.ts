import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF8F3",
        lavender: { DEFAULT: "#8D82C8", dark: "#6E62AE", deep: "#564A96", soft: "#EEEBF8", mist: "#F5F3FB" },
        navy: { DEFAULT: "#202B40", soft: "#4A5468", faint: "#7A8295" },
        sage: { DEFAULT: "#DCE9DE", dark: "#4F7A58", deep: "#3A5E42" },
        coral: { DEFAULT: "#E9A18D", dark: "#B4543A", soft: "#FBEAE4" },
        line: "#ECE7DC",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "Noto Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Kannada", "Noto Sans Malayalam", "Noto Sans Bengali", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "22px", xl2: "24px" },
      boxShadow: {
        card: "0 1px 2px rgba(32,43,64,0.04), 0 8px 24px -12px rgba(32,43,64,0.12)",
        lift: "0 2px 4px rgba(32,43,64,0.05), 0 18px 40px -18px rgba(32,43,64,0.25)",
        glow: "0 24px 60px -16px rgba(141,130,200,0.65)",
      },
      keyframes: {
        breathe: { "0%,100%": { transform: "scale(1)", opacity: "0.55" }, "50%": { transform: "scale(1.12)", opacity: "0.15" } },
        rise: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        wave: { "0%,100%": { transform: "scaleY(0.35)" }, "50%": { transform: "scaleY(1)" } },
      },
      animation: {
        breathe: "breathe 4.5s ease-in-out infinite",
        "breathe-slow": "breathe 4.5s ease-in-out 1.5s infinite",
        rise: "rise 420ms cubic-bezier(.2,.7,.2,1) both",
        wave: "wave 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
