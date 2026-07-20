// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0

// Structured changes report.
//
// In a real setup this data would be derived from running
//   oasdiff diff version-a.yaml version-b.yaml --format json
// as a build step. It is hardcoded here for demonstration purposes.
//
// Each entry's `change` is one of: "added" | "removed" | "changed".

const changesReport = {
  api: "User API",
  from: "v1.0.0",
  to: "v1.1.0",
  groups: [
    {
      title: "Endpoints",
      entries: [
        {
          change: "added",
          label: "POST /users/{id}/tokens",
          detail: "Issue a new access token for the given user.",
        },
        {
          change: "removed",
          label: "POST /legacy-login",
          detail: "Legacy username/password login flow.",
        },
      ],
    },
    {
      title: "GET /users · Parameters",
      entries: [
        {
          change: "added",
          label: 'query "offset"',
          detail: "integer · pagination offset",
        },
        {
          change: "removed",
          label: 'query "sort"',
          detail: "string · sort field",
        },
      ],
    },
    {
      title: "GET /users/{id} · Responses",
      entries: [
        {
          change: "added",
          label: "404 Not Found",
          detail: "User not found",
        },
      ],
    },
    {
      title: "User · Properties",
      entries: [
        { change: "added", label: '"email"', detail: "string" },
        { change: "removed", label: '"old_token"', detail: "string" },
        {
          change: "changed",
          label: '"timeout"',
          detail: "type: string → integer",
        },
      ],
    },
  ],
};

export default changesReport;
