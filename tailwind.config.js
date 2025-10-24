/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        "invitation-heading": ["'Playfair Display'", "serif"],
        "invitation-body": ["'Poppins'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
