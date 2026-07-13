// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { copyFile } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.js"],
  format: ["esm", "cjs"],
  target: "es2019",
  clean: true,
  sourcemap: false,
  minify: false,
  // react / react-dom / swagger-ui-react are peer dependencies and must not be
  // bundled — consumers already provide them.
  external: ["react", "react-dom", "swagger-ui-react"],
  // Ship the standalone stylesheet (consumers import it via the "./styles.css"
  // export). Copied here instead of via a separate CLI to avoid extra deps.
  async onSuccess() {
    await copyFile("src/diff.css", "dist/diff.css");
  },
});
