import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 16px 45px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;
