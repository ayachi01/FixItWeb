import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        "pangasinan-blue": "rgb(9, 39, 216)", // Royal Blue (Pantone 2728C)
        "pangasinan-yellow": "rgb(255, 218, 39)", // Golden Yellow (Pantone 115C)
        "pangasinan-white": "#FFFFFF", // Complementary White
        "pangasinan-black": "#000000", // Complementary Black
      },
      fontFamily: {
        heading: ["Arial Black", "Arial", "sans-serif"],
        body: ["Arial", "Times New Roman", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
