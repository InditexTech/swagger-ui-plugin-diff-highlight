// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "vitest/config";

export default defineConfig({
  // swagger-ui-react's default build bundles its own React; the browser build
  // shares the test's React so hooks work.
  resolve: { conditions: ["browser"] },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
    server: { deps: { inline: ["swagger-ui-react"] } },
  },
});
