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

describe("Bookshop-style schema demo fixtures", () => {
  it("marks the username maxLength change and keeps Shelf consistent in both modes", () => {
    const username = diffSpec.components.schemas.User.properties.username;
    expect(username["x-diff-original"].maxLength).toBe(100);
    expect(username["x-diff-new"]).toEqual(
      latestSpec.components.schemas.User.properties.username
    );
    const shelf = diffSpec.components.schemas.Shelf;
    expect(shelf["x-diff-status"]).toBe("updated");
    expect(shelf["x-diff-new"]).toEqual(latestSpec.components.schemas.Shelf);
    const entries = (title) =>
      report.groups.find((group) => group.title === title).entries;
    expect(entries("User · Properties")).toContainEqual({
      change: "changed",
      label: '"username"',
      detail: "maxLength: 100 → 200",
    });
    expect(entries("Shelf · Properties").map((entry) => entry.label)).toEqual([
      "description",
      '"label"',
      '"legacyCode"',
      '"capacity"',
    ]);
  });

  it.each([
    ["clean", latestSpec],
    ["diff", diffSpec],
  ])(
    "sends a User request body to the token operation in %s mode",
    (_, spec) => {
      const schema =
        spec.paths["/users/{id}/tokens"].post.requestBody.content[
          "application/json"
        ].schema;
      expect(schema).toEqual({ $ref: "#/components/schemas/User" });
    }
  );
});
