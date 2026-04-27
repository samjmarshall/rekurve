import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
  testEnvironment: "node",
  plugins: [pluginReact()],
  restoreMocks: true,
  coverage: {
    enabled: false,
    provider: "istanbul",
    reporters: ["text", "json-summary", "json"],
    reportsDirectory: "./coverage",
  },
});
