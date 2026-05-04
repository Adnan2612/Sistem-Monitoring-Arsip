/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🌿 PRIMARY BRAND (lebih smooth & modern)
        primary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534", // warna utama kamu
          900: "#14532d",
        },

        // 🌫️ NEUTRAL (biar elegan, nggak flat)
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
      },

      // ✨ SHADOW MODERN (ini penting banget buat “mahal feel”)
      boxShadow: {
        soft: "0 4px 20px rgba(0,0,0,0.05)",
        medium: "0 8px 30px rgba(0,0,0,0.08)",
        strong: "0 12px 40px rgba(0,0,0,0.12)",
      },

      // 🔵 BORDER RADIUS (lebih smooth)
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },

      // 🅰️ FONT (biar nggak keliatan default)
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};