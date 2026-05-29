/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        agua: {
          light: "#cffafe",
          DEFAULT: "#06b6d4",
          dark: "#0e7490",
        },
        gas: {
          light: "#fee2e2",
          DEFAULT: "#f97316",
          dark: "#c2410c",
        },
      },
    },
  },
  plugins: [],
};
