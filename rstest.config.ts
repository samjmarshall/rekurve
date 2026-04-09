import { defineConfig } from "@rstest/core";

export default defineConfig({
  include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  testEnvironment: "node",
  restoreMocks: true,
  coverage: {
    enabled: false,
    provider: "istanbul",
    reporters: ["text", "json-summary", "json"],
    reportsDirectory: "./coverage",
  },
});
