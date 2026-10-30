import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Client sources live in ./client; the build goes to ./client/dist (served by the backend).
export default defineConfig({
  root: "client",
  plugins: [react()],
  server: {
    host: true,
    port: 8766,
    // In local dev, /api calls are proxied to the Express backend.
    proxy: { "/api": `http://localhost:${process.env.API_PORT || 8787}` },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
