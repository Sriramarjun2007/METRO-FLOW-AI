/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#050714",
          800: "#0a1024",
          700: "#121a36",
          600: "#1c264c",
        },
        neon: {
          cyan: "#22e0ff",
          violet: "#8b5cf6",
          emerald: "#22d3a5",
          rose: "#ff5d7a",
          amber: "#f5b942",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)," +
          "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(8, 12, 30, 0.5), inset 0 0 0 1px rgba(255,255,255,0.05)",
        "glass-strong":
          "0 12px 48px rgba(8, 12, 30, 0.65), inset 0 0 0 1px rgba(255,255,255,0.1)",
      },
      keyframes: {
        pulse_soft: {
          "0%,100%": { opacity: 0.85 },
          "50%": { opacity: 1 },
        },
        flow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        pulse_soft: "pulse_soft 3s ease-in-out infinite",
        flow: "flow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
