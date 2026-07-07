import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Two test "projects" run under one Vitest invocation:
//   - server: Node environment for the Express/Pinecone/embedding code
//   - app:    jsdom environment for the React frontend
//
// The server code uses TypeScript ESM with explicit extensions (mixing `.ts`
// and `.js` specifiers that both resolve to `.ts` source). Vite resolves these,
// so no ts-node loader is needed under test.
export default defineConfig({
  test: {
    // Don't fail the whole run if a project has no test files yet (e.g. before
    // the frontend tests land). Individual projects still run what they find.
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "server",
          environment: "node",
          include: ["server/**/*.test.ts", "tests/server/**/*.test.ts"],
          // Model download + inference in the integration tests is slow on a
          // cold cache; give them room.
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        plugins: [react()],
        test: {
          name: "app",
          environment: "jsdom",
          globals: true,
          include: ["app/src/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/setup.app.ts"],
        },
      },
    ],
  },
});
