import path from "path";
import { defineConfig } from "vite";
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
});
