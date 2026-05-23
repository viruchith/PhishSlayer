/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slayer: {
          ink: "#0b1220",
          panel: "#111827",
          accent: "#22d3ee",
          warn: "#fbbf24",
          ok: "#34d399",
        },
      },
    },
  },
  plugins: [],
};
