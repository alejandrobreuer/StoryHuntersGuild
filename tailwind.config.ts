import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Parchment/leather/crimson/brass — hex values carried over from the
        // reference prototype's tuned palette (public/index.html in the
        // story-hunters-guild reference build).
        parchment: {
          DEFAULT: "#EFE4CC",
          dark:    "#e0cfa8",
          deep:    "#c9b07a",
        },
        leather: {
          DEFAULT: "#3d3830", // was "stone-dark" in the reference — background/leather tone
          light:   "#7a7065", // "stone"
          lighter: "#a89f94", // "stone-light"
        },
        ink: {
          DEFAULT: "#4A3423", // headline/body text on light surfaces — deep leather-brown, not near-black
          light:   "#6B5D4F", // "ink-muted" — secondary text on light surfaces
        },
        moss: {
          DEFAULT: "#4a6741",
          light:   "#6b8f62",
          dark:    "#2e4028",
        },
        crimson: {
          DEFAULT:    "#7A2020",
          foreground: "#F4EBD9",
        },
        brass: {
          // Accent only — borders, small uppercase labels, icons. Never large
          // headline/body text; its saturation reads as neon on big surfaces.
          DEFAULT: "#A9793A",
          light:   "#d4a843",
          bright:  "#f0c040",
        },
        wood: {
          // Quest Board plank surface — distinct from `leather` (UI chrome),
          // used only for the literal wood-and-pinned-paper mission board.
          DEFAULT: "#5c4430",
          dark:    "#3f2f20",
          light:   "#7a5c3e",
        },

        // Finanzas (admin) — a lighter palette tuned for reading numbers.
        // Values from Reference/Docs/finanzas/SPEC.md §5.
        fin: {
          ground:        "#F6F1E7",
          surface:       "#FFFDF9",
          alt:           "#FBF7EF",
          ink:           "#2A2017",
          muted:         "#6A5B4C",
          line:          "#E4DACA",
          rowline:       "#EFE7DA",
          input:         "#CDBFA8",
          crimson:       "#8E2A23",
          income:        "#1F5F8B",
          "income-bg":   "#E6EFF6",
          expense:       "#A6501C",
          "expense-bar": "#D9894F",
          "expense-bg":  "#F8EADF",
          "expense-pill": "#8A4216",
          edit:          "#FFF4D6",
          "edit-border": "#EAD9AE",
          "pending-bg":  "#FDF0D5",
          pending:       "#7A5410",
          "ok-bg":       "#E7F0EA",
          ok:            "#2E5E3E",
        },

        // Semantic
        background: "#3d3830",
        surface:    "#f2e8d5",
        border:     "#c9b07a",
      },

      fontFamily: {
        display: ["var(--font-cinzel)", "Georgia", "serif"],
        body:    ["var(--font-crimson)", "Georgia", "serif"],
        label:   ["var(--font-oswald)", "system-ui", "sans-serif"],
        // Finanzas tables and dashboard only (loaded in its layout).
        data:    ["var(--font-plex)", "system-ui", "sans-serif"],
      },

      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.9rem" }],
      },

      boxShadow: {
        // Warm leather-brown tint, replacing cardstash.ar's cool navy shadows
        parchment:    "0 2px 6px 0 rgba(74,52,35,0.25), 0 1px 2px -1px rgba(74,52,35,0.18)",
        "parchment-lg": "0 10px 28px -6px rgba(74,52,35,0.30), 0 4px 10px -4px rgba(74,52,35,0.20)",
        seal: "0 0 0 3px rgba(169,121,58,0.45)",
        glow: "0 0 18px rgba(169,121,58,0.38)",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { transform: "translateX(-100%)" },
          to:   { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out both",
        shimmer:   "shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
