# Exeer — Manager Dashboard

RTL Arabic admin dashboard (React + Tailwind CSS + lucide-react).

## Run locally

```bash
cd ~/exeer-dashboard
npm install   # includes react-markdown, react-router-dom
npm run dev

- Desktop: http://localhost:5173/
- Mobile: http://localhost:5173/mobile (auto-redirect when viewport &lt; 768px)

Brand assets live in `src/assets/` (`logo-dark.png`, `logo-light.png`, `logo-symbol-dark.png`, `logo-symbol-light.png`) and are mirrored under `public/` for the favicon (`/logo-symbol-dark.png`).
```

The full UI lives in **`src/App.jsx`** (single copy-pasteable component file).

## Design

- Material Design 3–inspired typography and shapes
- Flat 2D UI: no shadows, borders only
- RTL (`dir="rtl"`) with Zain font
