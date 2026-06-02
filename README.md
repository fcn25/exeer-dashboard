# Exeer — Manager Dashboard

RTL Arabic admin dashboard (React + Tailwind CSS + lucide-react).

## Run locally

```bash
cd ~/exeer-dashboard
npm install   # includes react-markdown, react-router-dom
npm run dev

- Desktop: http://localhost:5173/
- Mobile: http://localhost:5173/mobile (auto-redirect when viewport &lt; 768px)

Place your brand logo at `public/logo.png` (served as `/logo.png` on the auth screen).
```

The full UI lives in **`src/App.jsx`** (single copy-pasteable component file).

## Design

- Material Design 3–inspired typography and shapes
- Flat 2D UI: no shadows, borders only
- RTL (`dir="rtl"`) with Zain font
