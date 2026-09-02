<!--
SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Bumped `swagger-ui-react` to `^5.32.14` (root and `example/`), which transitively resolves:
  - `js-yaml` to `>=4.3.1`, fixing merge-key/omap quadratic complexity issues (CVE-2026-59869, CVE-2026-59868)
  - `dompurify` to `>=3.4.13`, fixing an `IN_PLACE` XSS bypass
  - `immutable` (nested instance) to `4.3.9`, removing the vulnerable `3.x` line entirely (CVE-2026-59880, CVE-2026-59879)
- Bumped the `immutable` devDependency floor to `^4.3.9` (CVE-2026-59880, CVE-2026-59879)
- Updated transitive `brace-expansion` to `>=1.1.18`/`>=5.0.9`, fixing DoS via unbounded expansion (CVE-2026-14257, CVE-2026-69152)
- Updated transitive `postcss` to `>=8.5.23`, fixing an incomplete `sourceMappingURL` path-traversal fix (CVE-2026-69153)
- Updated transitive `undici` to `>=7.29.0`, fixing several request/response handling issues

## [0.1.0] - 2026-07-20

### Added

- Initial OSS repository shell.
- Original code, including the diff highlighting plugin, and the example React application.

[Unreleased]: https://github.com/InditexTech/swagger-ui-plugin-diff-highlight/compare/0.1.0...HEAD
[0.1.0]: https://github.com/InditexTech/swagger-ui-plugin-diff-highlight/releases/tag/0.1.0
