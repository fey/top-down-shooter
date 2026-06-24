import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/top-down-shooter/",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
