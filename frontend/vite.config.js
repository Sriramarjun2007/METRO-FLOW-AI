import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "https://metro-flow-ai.onrender.com",
        changeOrigin: true,
      },
      "/ws": {
        target: "wss://metro-flow-ai.onrender.com",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: { outDir: "dist", sourcemap: true },
});
