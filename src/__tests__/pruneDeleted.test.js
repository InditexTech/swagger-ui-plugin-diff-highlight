// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";

import { pruneDeleted } from "../DiffHighlightPlugin";

const gone = { type: "string", "x-diff-status": "deleted" };

it("removes deleted properties and their names from required", () => {
  const schema = {
    type: "object",
    required: ["id", "legacyCode"],
    properties: { id: { type: "string" }, legacyCode: gone },
  };
  const snapshot = structuredClone(schema);
  expect(pruneDeleted(schema)).toEqual({
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  });
  expect(schema).toEqual(snapshot);
});

it("keeps added, updated and unchanged properties", () => {
  const schema = {
    type: "object",
    required: ["a", "b", "c"],
    properties: {
      a: { type: "string", "x-diff-status": "added" },
      b: { type: "string", "x-diff-status": "updated" },
      c: { type: "string" },
    },
  };
  expect(pruneDeleted(schema)).toBe(schema);
});

it("prunes items, additionalProperties and composed members", () => {
  const holder = { type: "object", properties: { gear: gone, cog: {} } };
  const schema = {
    type: "object",
    properties: {
      list: { type: "array", items: holder },
      map: { type: "object", additionalProperties: holder },
      either: { oneOf: [holder, gone], anyOf: [holder], allOf: [holder] },
    },
  };
  const kept = { type: "object", properties: { cog: {} } };
  expect(pruneDeleted(schema)).toEqual({
    type: "object",
    properties: {
      list: { type: "array", items: kept },
      map: { type: "object", additionalProperties: kept },
      either: { oneOf: [kept], anyOf: [kept], allOf: [kept] },
    },
  });
});

it("drops a deleted items or additionalProperties schema", () => {
  expect(pruneDeleted({ type: "array", items: gone })).toEqual({
    type: "array",
  });
  expect(pruneDeleted({ type: "object", additionalProperties: gone })).toEqual({
    type: "object",
  });
});

it("terminates on a cyclic schema", () => {
  const node = { type: "object", properties: { legacyCode: gone } };
  node.properties.next = node;
  const pruned = pruneDeleted(node);
  expect(Object.keys(pruned.properties)).toEqual(["next"]);
});
