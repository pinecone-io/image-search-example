import path from "path";
import { defineConfig } from "vitest/config";
import { VitePluginNode } from "vite-plugin-node";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vitejs.dev/config/
export default defineConfig({
  root: __dirname,
  server: {
    port: 3000,
  },
  plugins: [
    VitePluginNode({
      adapter: "express",
      appPath: "./index.ts",
    }),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, "../data"),
          dest: "./data",
        },
      ],
    }),
  ],
  build: {
    outDir: "../dist/server",
    emptyOutDir: true,
    target: "node18.17.1",
  },
  test: {
    globals: true,
    cache: false,
    threads: false,
    coverage: {
      lines: 100,
      branches: 100,
      functions: 100,
      statements: 100,
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary", "lcov"],
    },
    // Some tests are flaky due to comunication to external APIs.
    // In order to escape nightmare in CI/CD pipelines we will retrigger and rerun.
    // Retry the test specific number of times if it fails.
    retry: 5,
  },
});
