<!--
SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Schema accordions that contain a changed descendant get a `diff-ancestor` class and an ochre header mark, visible while collapsed or expanded ([#64](https://github.com/InditexTech/swagger-ui-plugin-diff-highlight/issues/64))

### Changed

- Bumped the development dependency `tsup` from `^8.3.5` to `^9.0.0`
- `styles.css` no longer uses `!important`. The diff marks still override Swagger UI's styles through selector specificity, so they render the same
- Test runs now report coverage to SonarCloud through `coverage/lcov.info`

## [0.2.0] - 2026-10-15

### Security

- Bumped `swagger-ui-react` to `^5.32.14` (root and `example/`), which transitively resolves:
  - `js-yaml` to `>=4.3.1`, fixing merge-key/omap quadratic complexity issues (CVE-2026-59869, CVE-2026-59868)
  - `dompurify` to `>=3.4.13`, fixing an `IN_PLACE` XSS bypass
  - `immutable` (nested instance) to `4.3.9`, removing the vulnerable `3.x` line entirely (CVE-2026-59880, CVE-2026-59879)
- Bumped the `immutable` devDependency floor to `^4.3.9` (CVE-2026-59880, CVE-2026-59879)
- Updated transitive `brace-expansion` to `>=1.1.18`/`>=5.0.9`, fixing DoS via unbounded expansion (CVE-2026-14257, CVE-2026-69152)
- Updated transitive `postcss` to `>=8.5.23`, fixing an incomplete `sourceMappingURL` path-traversal fix (CVE-2026-69153)
- Updated transitive `undici` to `>=7.29.0`, fixing several request/response handling issues

### Changed

- Added a `verify` npm script (`lint`, `format:check`, `test`, `build`) used by the governed CI verify workflows.
- Updated governance CI: issue/PR templates, `REUSE.toml`, `repolinter.json`, `.prettierignore`, `.sync-exclude`, and the governed workflow set.
- Updated `vitest` to `^5.0.1` and refreshed lockfiles.
- Set the development version to `0.2.0-SNAPSHOT` so the governed release workflow cuts `0.2.0` (it releases the current version without `-SNAPSHOT` and bumps the next development version by the release-type label).

## [0.1.0] - 2026-07-20

### Added

- Initial OSS repository shell.
- Original code, including the diff highlighting plugin, and the example React application.

[Unreleased]: https://github.com/InditexTech/swagger-ui-plugin-diff-highlight/compare/0.2.0...HEAD

[0.2.0]: https://github.com/InditexTech/swagger-ui-plugin-diff-highlight/compare/0.1.0...0.2.0

[0.1.0]: https://github.com/InditexTech/swagger-ui-plugin-diff-highlight/releases/tag/0.1.0
