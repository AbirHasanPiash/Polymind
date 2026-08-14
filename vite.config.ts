import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Chunking is left to Rollup's default route-based splitting, driven by the
    // React.lazy() calls in App.tsx. Forcing vendor chunks with manualChunks was
    // tried and made things worse: a manual chunk becomes a shared chunk, so the
    // markdown, highlighting and charting bundles were hoisted into index.html
    // as modulepreloads and downloaded on the landing page. Left alone, they
    // stay inside the lazy chunk that needs them.
    chunkSizeWarningLimit: 700,
    sourcemap: false,
    target: "es2022",
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
