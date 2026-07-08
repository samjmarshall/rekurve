import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rstest/core";

const ROOT = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  setupFiles: ["./rstest.setup.ts"],
  include: [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "scripts/**/*.test.ts",
    "e2e/utils/**/*.test.ts",
  ],
  testEnvironment: "node",
  // Rspack (not Node) resolves imports in the test bundle, so the Makefile's
  // NODE_OPTIONS=--conditions=react-server doesn't reach it. Without the
  // `react-server` condition, `import "server-only"` resolves to its throwing
  // entry and every test touching a marked module fails at load. But setting
  // conditionNames to ["react-server", "..."] bundle-wide is worse: `react`
  // itself then resolves to its react-server build, which lacks createContext
  // and useLayoutEffect, breaking every client-component test. Alias only the
  // marker package to a no-op stub instead ($ = exact match).
  resolve: {
    alias: {
      "server-only$": join(ROOT, "rstest.server-only-stub.ts"),
    },
  },
  plugins: [pluginReact()],
  restoreMocks: true,
  coverage: {
    enabled: false,
    provider: "istanbul",
    reporters: ["text", "json-summary", "json"],
    reportsDirectory: "./coverage",
  },
});
