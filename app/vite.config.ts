import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true
      },
      "/data": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true
      },
    },
  },
  build: {
    outDir: "../dist/app",
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: './tests/globalSetup/setup.ts',
  },
});
