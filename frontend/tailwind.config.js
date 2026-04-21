/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        risk: {
          critical: "#f87171",
          high: "#fb923c",
          moderate: "#fbbf24",
          low: "#34d399",
        },
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        pulse2: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
        cloudDrift: { from: { transform: "translateX(-200px)" }, to: { transform: "translateX(110vw)" } },
        lightning: { "0%,88%,92%,100%": { opacity: 0 }, "90%": { opacity: 0.5 } },
        rainFall: { from: { transform: "translateY(-100vh)" }, to: { transform: "translateY(100vh)" } },
      },
      animation: {
        "fade-up": "fadeUp 0.35s ease both",
        "pulse2": "pulse2 2s ease-in-out infinite",
        "cloud1": "cloudDrift 50s linear infinite",
        "cloud2": "cloudDrift 70s linear infinite 12s",
        "cloud3": "cloudDrift 60s linear infinite 6s",
        "lightning": "lightning 9s ease-in-out infinite 2s",
        "rain": "rainFall 0.6s linear infinite",
      },
      backdropBlur: { xs: "4px" },
    },
  },
  plugins: [],
}