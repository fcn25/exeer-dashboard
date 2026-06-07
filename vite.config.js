import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import circleDependency from "vite-plugin-circular-dependency";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    envDir: ".",
    define: {
      "import.meta.env.VITE_GEMINI_API_KEY": JSON.stringify(
        env.VITE_GEMINI_API_KEY ?? "",
      ),
    },
    plugins: [
      react(),
      tailwindcss(),
      circleDependency({
        outputFilePath: "./circular-deps-report.txt",
        circleImportThrowErr: true,
      }),
      cloudflare(),
    ],
  };
});
