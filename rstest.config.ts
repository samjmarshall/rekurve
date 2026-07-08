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
