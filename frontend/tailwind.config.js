/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050816",
        card: "rgba(15, 23, 42, 0.75)",
        primary: "#7c3aed",
        "muted-foreground": "#94a3b8",
      },
    },
  },
  plugins: [],
};
