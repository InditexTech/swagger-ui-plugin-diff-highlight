// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";

import report from "../../example/src/specs/diffReport";
import diffSpec from "../../example/src/specs/diffSpec.json";
import latestSpec from "../../example/src/specs/latestSpec.json";

describe("User API demo fixtures", () => {
  it("keeps the current role schema consistent in clean and diff modes", () => {
    const role = diffSpec.components.schemas.RoleEnum;
    expect(role).toMatchObject({
      title: "RoleEnum",
      type: "string",
      enum: ["admin", "member", "contributor", "auditor"],
      "x-diff-status": "updated",
      "x-diff-original": {
        title: "RoleEnum",
        type: "string",
        enum: ["admin", "member", "editor", "guest"],
      },
    });
    expect(role["x-diff-new"]).toEqual(latestSpec.components.schemas.RoleEnum);
    expect(role.enum).toEqual(role["x-diff-new"].enum);
  });

  it.each([
    ["clean", latestSpec],
    ["diff", diffSpec],
  ])("references the existing role schema in %s mode", (_, spec) => {
    const schemas = spec.components.schemas;
    expect(schemas.User.properties.role).toEqual({
      $ref: "#/components/schemas/RoleEnum",
    });
    expect(schemas.RoleEnum).toBeDefined();
    expect(JSON.stringify(spec)).not.toContain("EnvironmentEnum");
  });

  it("reports removed, replaced, and added roles", () => {
    const roles = report.groups.find((group) =>
      group.title.includes("RoleEnum")
    );
    expect(roles).toEqual({
      title: "RoleEnum · Values used by User.role",
      entries: [
        {
          change: "removed",
          label: '"guest"',
          detail: "No longer an allowed role.",
        },
        {
          change: "changed",
          label: '"editor" → "contributor"',
          detail: "Role value renamed.",
        },
        {
          change: "added",
          label: '"auditor"',
          detail: "New allowed role.",
        },
      ],
    });
    expect(JSON.stringify(report)).not.toContain("EnvironmentEnum");
  });
});
