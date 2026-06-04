import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import circleDependency from "vite-plugin-circular-dependency";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    circleDependency({
      outputFilePath: "./circular-deps-report.txt",
      circleImportThrowErr: true,
    }),
    cloudflare(),
  ],
});
