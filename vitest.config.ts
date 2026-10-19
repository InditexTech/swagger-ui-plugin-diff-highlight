// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["browser"],
  },
  test: {
    server: {
      deps: { inline: ["swagger-ui-react"] },
    },
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/**/*.{js,jsx}"],
      reporter: ["text", "lcovonly"],
      // Matches the SonarCloud quality gate on new code.
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
