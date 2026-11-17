/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#b9ddfd",
          500: "#1d72b8",
          600: "#0b589c",
          700: "#064278",
        },
        // Pure Matte Black Dark Mode Palette
        slate: {
          950: "#09090b", // Deep Matte Black Background
          900: "#121214", // Matte Black Card & Canvas Surface
          800: "#18181b", // Matte Black Elevated Surface / Toolbar
          700: "#27272a", // Matte Black Subtle Border
          600: "#3f3f46",
          500: "#71717a",
          400: "#a1a1aa",
          300: "#d4d4d8",
          200: "#e4e4e7",
          100: "#f4f4f5",
          50: "#fafafa"
        }
      }
    },
  },
  plugins: [],
}
