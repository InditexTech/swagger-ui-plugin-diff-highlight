// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "example/"],
  },

  // Library source and tests (JavaScript + JSX).
  {
    files: ["src/**/*.{js,jsx}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // The automatic JSX runtime does not require React in scope.
      "react/react-in-jsx-scope": "off",
      // The plugin wraps swagger-ui components whose props come from an
      // untyped Immutable.js data model, so PropTypes validation and display
      // names on the anonymous wrapper HOCs add noise without value.
      "react/prop-types": "off",
      "react/display-name": "off",
    },
  },

  // TypeScript declaration and config files.
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.recommended],
    rules: {
      // The hand-written declarations mirror swagger-ui's untyped plugin API,
      // where `any` is the accurate shape for wrapped components.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Node-based config and setup files.
  {
    files: ["*.config.{ts,mjs}", "vitest.setup.js"],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Disable stylistic rules handled by Prettier. Must stay last.
  prettier
);
