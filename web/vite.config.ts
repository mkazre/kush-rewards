import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The website is served by Laravel: `npm run build` writes into backend/public/app and
// Laravel returns app/index.html for every non-API path. In dev, /api is proxied to `php artisan serve`.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/app/" : "/",
  plugins: [react(), tailwindcss()],
  // Don't let esbuild read mobile/tsconfig.json (it extends Expo's base, which isn't installed here).
  // (A string tsconfigRaw makes Vite skip tsconfig lookup entirely.)
  esbuild: { tsconfigRaw: JSON.stringify({ compilerOptions: { jsx: "react-jsx", target: "es2022", useDefineForClassFields: true } }) },
  resolve: {
    alias: {
      // Pure TypeScript shared with the mobile app: API types, content filter, tags, suburbs, legal text.
      "@shared": fileURLToPath(new URL("../mobile/src", import.meta.url)),
    },
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:8000", "/uploads": "http://127.0.0.1:8000" },
  },
  build: {
    outDir: "../backend/public/app",
    emptyOutDir: true,
  },
}));
