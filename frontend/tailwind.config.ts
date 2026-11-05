import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: {
          DEFAULT: "#0A0A0A",
          secondary: "#111111",
          elevated: "#171717",
          highlight: "#222222",
        },
        border: {
          DEFAULT: "#292929",
          subtle: "#1F1F1F",
          focus: "#FFFFFF",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#A3A3A3",
          muted: "#737373",
        },
        accent: {
          DEFAULT: "#FFFFFF",
          hover: "#E5E5E5",
          muted: "#A3A3A3",
          glow: "rgba(255, 255, 255, 0.15)",
        },
        error: {
          DEFAULT: "#EF4444",
          muted: "#DC2626",
          bg: "rgba(239, 68, 68, 0.10)",
        },
        warning: {
          DEFAULT: "#D4D4D4",
          bg: "rgba(255, 255, 255, 0.05)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.5)",
        card: "0 4px 20px 0 rgba(0, 0, 0, 0.6)",
        pill: "0 8px 32px 0 rgba(0, 0, 0, 0.8)",
        glow: "0 0 20px -5px rgba(255, 255, 255, 0.2)",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px",
        full: "9999px",
      },
      animation: {
        "letter-reveal": "letterReveal 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        letterReveal: {
          "0%, 100%": { opacity: "0.2", filter: "blur(0.5px)" },
          "50%": { opacity: "1", filter: "blur(0px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
