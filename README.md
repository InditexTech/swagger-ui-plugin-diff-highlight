<!--
SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

![GitHub License](https://img.shields.io/github/license/InditexTech/swagger-ui-plugin-diff-highlight)

# swagger-ui-plugin-diff-highlight

A [`swagger-ui-react`](https://www.npmjs.com/package/swagger-ui-react) / Swagger UI plugin that **highlights API changes inline** — added, deleted, and updated operations, parameters, responses, and schema properties are marked directly in the Swagger UI, without leaving the docs.

It reads custom `x-diff-*` extensions from the loaded OpenAPI document and renders them as visual diff marks.

<!-- Add video/image/demo here -->

## Features

When an API evolves from one version to the next, it is hard to see _what actually changed_ from a plain Swagger UI page. This plugin annotates the rendered document with diff marks driven by `x-diff-*` extensions:

| Status    | Appearance                                                  |
| --------- | ----------------------------------------------------------- |
| `added`   | green + bold                                                |
| `deleted` | red + strikethrough                                         |
| `updated` | inline `old → new` (old in red strikethrough, new in green) |

## Getting Started

### Installation

```bash
npm install @inditextech/swagger-ui-plugin-diff-highlight
```

`react`, `react-dom`, and `swagger-ui-react` are peer dependencies — install them in your app if you haven't already:

```bash
npm install react react-dom swagger-ui-react
```

### Usage

Register the plugin and import its stylesheet where you render Swagger UI:

```jsx
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

import DiffHighlightPlugin from "@inditextech/swagger-ui-plugin-diff-highlight";
import "@inditextech/swagger-ui-plugin-diff-highlight/styles.css";

export default function Docs({ spec }) {
  return <SwaggerUI spec={spec} plugins={[DiffHighlightPlugin]} />;
}
```

Then feed it an annotated spec. Anything without an annotation renders normally.

> The `plugins` prop is read only when Swagger UI mounts. If you toggle the
> plugin on/off at runtime, change the component `key` to force a remount —
> see the demo in [`example/`](./example).

#### Annotating your OpenAPI document

Annotate any operation, parameter, response, or schema property with `x-diff-status`:

```jsonc
// An added parameter
{
  "name": "offset",
  "in": "query",
  "schema": { "type": "integer", "default": 0 },
  "x-diff-status": "added"
}

// A deleted parameter
{
  "name": "sort",
  "in": "query",
  "schema": { "type": "string" },
  "x-diff-status": "deleted"
}

// An added response
"404": {
  "description": "User not found.",
  "x-diff-status": "added",
  "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Error" } } }
}
```

For an **updated** schema property, also provide the before/after sub-schemas so the plugin can render `old → new`:

```jsonc
"timeout": {
  "type": "integer",
  "x-diff-status": "updated",
  "x-diff-original": { "type": "string" },
  "x-diff-new": { "type": "integer" }
}
```

Valid `x-diff-status` values: `added`, `deleted`, `updated`, `unchanged` (or simply omit the extension for unchanged elements).

##### Where each key goes


| Extension         | Where it lives                                                              | Notes                                             |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| `x-diff-status`   | On an operation, a parameter object, a response object, or a schema property | Required on every element you want to mark         |
| `x-diff-original` | On a schema property only                                                  | Only with `"updated"`; the **before** sub-schema  |
| `x-diff-new`      | On a schema property only                                                  | Only with `"updated"`; the **after** sub-schema   |

All three keys are **sibling properties** of the element they annotate. `x-diff-original` / `x-diff-new` are only read for `"updated"` schema properties — for added/deleted elements, `x-diff-status` alone is enough.

#### Generating the annotations automatically

You don't have to annotate by hand. Compute the diff between your **old** and **new** OpenAPI documents with any API-diff tool, then merge the result back into your **new** spec as `x-diff-*` extensions before passing it to Swagger UI. The plugin only cares that the final document carries `x-diff-status` on the changed elements — it doesn't care which tool produced the diff.

Whatever tool you use, the change types map onto `x-diff-status` the same way:

| Diff-tool change type          | `x-diff-status` | Extra keys                    |
| ------------------------------ | --------------- | ----------------------------- |
| added / new                    | `added`         | –                             |
| removed / deleted / missing    | `deleted`       | –                             |
| changed / modified             | `updated`       | `x-diff-original`, `x-diff-new` (schema properties) |

The three examples below convert real output from popular tools into the same annotated spec.

##### Example 1: [`oasdiff`](https://github.com/oasdiff/oasdiff) (YAML)

`oasdiff diff old.yaml new.yaml` prints a path-hierarchy diff. Here an operation was added and a query parameter was removed:

```yaml
paths:
  modified:
    /users:
      operations:
        added:
          - POST
        modified:
          GET:
            parameters:
              deleted:
                query:
                  - sort
```

Apply the mapping to your **new** spec — `added` operation → `x-diff-status: "added"`, `deleted` parameter (re-added so it still renders) → `x-diff-status: "deleted"`:

```jsonc
"/users": {
  "post": {
    "summary": "Create a user",
    "x-diff-status": "added"
  },
  "get": {
    "parameters": [
      {
        "name": "sort",
        "in": "query",
        "schema": { "type": "string" },
        "x-diff-status": "deleted"
      }
    ]
  }
}
```

##### Example 2: [`openapi-diff`](https://github.com/OpenAPITools/openapi-diff) (JSON)

`openapi-diff old.yaml new.yaml --json out.json` emits a structured report with `newEndpoints`, `missingEndpoints`, and `changedOperations`. Here a new endpoint appears and a body property changed type:

```jsonc
{
  "newEndpoints": [
    { "method": "POST", "pathUrl": "/users", "summary": "Create a user" }
  ],
  "changedOperations": [
    {
      "httpMethod": "GET",
      "pathUrl": "/users/{id}",
      "responseChanged": {
        "changedProperties": {
          "timeout": { "oldType": "string", "newType": "integer" }
        }
      }
    }
  ]
}
```

Mark the new operation as `added`, and the changed property as `updated` with its before/after sub-schemas:

```jsonc
"/users": {
  "post": { "summary": "Create a user", "x-diff-status": "added" }
}

// ...inside the response schema for GET /users/{id}
"timeout": {
  "type": "integer",
  "x-diff-status": "updated",
  "x-diff-original": { "type": "string" },
  "x-diff-new": { "type": "integer" }
}
```

##### Example 3: [`bump diff`](https://github.com/bump-sh/cli) (Bump.sh, text)

Bump.sh's CLI prints a human-readable changelog (run `bump diff old.yaml new.yaml`). It flags breaking changes but isn't machine-structured, so you translate it by eye (or use `bump diff --format markdown`/`json`):

```text
Modified: GET /users/{id}
  Response modified: 200
    [Breaking] Body attribute modified: timeout
```

A modified attribute type maps to an `updated` schema property. Supply the old and new types as sub-schemas:

```jsonc
"timeout": {
  "type": "integer",
  "x-diff-status": "updated",
  "x-diff-original": { "type": "string" },
  "x-diff-new": { "type": "integer" }
}
```

> The merge step (folding the diff back into the new spec) is up to you — do it by hand for small diffs, or script it for larger ones. The plugin's only requirement is that the final document carries `x-diff-status` on the changed elements.

## How it works

The plugin uses Swagger UI's [`wrapComponents`](https://swagger-ui.github.io/swagger-ui/usage/customization/plugin-api/) API to intercept rendering and attach diff CSS classes. It wraps four components (note the exact registration casing):

| Component      | What it marks           | Where it reads the status                              |
| -------------- | ----------------------- | ------------------------------------------------------ |
| `operation`    | An endpoint / opblock   | The **unresolved** spec via `specSelectors`/`specPath` |
| `parameterRow` | A request parameter row | `props.param` / `props.rawParam`                       |
| `response`     | A response row          | `props.response`                                       |
| `Model`        | A schema property       | `props.schema`                                         |

Two implementation details worth knowing:

- **Operations are read from the unresolved spec.** Swagger UI resolves an operation's subtree _lazily_, only once it is expanded. The plugin reads `x-diff-status` straight from `specSelectors.specJson()` using the `specPath`, so the mark is visible whether the operation is **collapsed or expanded**.
- **Table layout is preserved.** Rows (`<tr>`) must stay direct children of their table, so the plugin wraps them in a `display: contents` element to apply the diff class without breaking the table flow.

### Notes / caveats

- Use OpenAPI **3.0.x** documents — the `Model` wrapping relies on the 3.0 render pipeline.
- Component registration names are case-sensitive: `operation`, `parameterRow` (camelCase), `response` (lowercase), `Model`.

## Demo

A full Vite demo lives in [`example/`](./example). It wires a toolbar (toggle inline diffs, open a Changes Report modal) around Swagger UI and the plugin.

```bash
# 1. build the library from the repo root
npm install
npm run build

# 2. run the demo
cd example
npm install        # resolves the library via "file:.."
npm start          # http://localhost:3000
```

## Contributing

We welcome contributions!

Please read our [CONTRIBUTING.md](./CONTRIBUTING.md) and follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Acknowledgments

<!-- Mention any projects used as inspiration, key dependencies... -->

## License

This project is licensed under the [Apache-2.0 License](./LICENSE).

© 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
