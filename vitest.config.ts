// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    conditions: ["browser"],
    // The demo app imports the published package; test it against src/ with
    // the root copies of React and Swagger UI, even when example/ has its own.
    alias: [
      {
        find: /^@inditextech\/swagger-ui-plugin-diff-highlight$/,
        replacement: fromRoot("./src/index.js"),
      },
      {
        find: /^@inditextech\/swagger-ui-plugin-diff-highlight\/styles\.css$/,
        replacement: fromRoot("./src/diff.css"),
      },
    ],
    dedupe: ["react", "react-dom", "swagger-ui-react"],
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
      include: ["src/**/*.{js,jsx}", "example/src/**/*.{js,jsx}"],
      reporter: ["text", "lcovonly"],
      // Matches the SonarCloud quality gate on new code.
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
