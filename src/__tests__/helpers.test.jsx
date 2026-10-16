// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { render } from "@testing-library/react";
import { fromJS } from "immutable";
import { describe, expect, it } from "vitest";

import {
  containsChange,
  describeSchema,
  readStatus,
  wrapContents,
} from "../DiffHighlightPlugin";

describe("readStatus", () => {
  it("returns the x-diff-status value from an Immutable Map", () => {
    const map = fromJS({ "x-diff-status": "added" });
    expect(readStatus(map)).toBe("added");
  });

  it("returns undefined when the extension is absent", () => {
    const map = fromJS({ type: "string" });
    expect(readStatus(map)).toBeUndefined();
  });

  it("returns undefined for a null input", () => {
    expect(readStatus(null)).toBeUndefined();
  });

  it("returns undefined for a plain object without a get method", () => {
    expect(readStatus({ "x-diff-status": "added" })).toBeUndefined();
  });
});

describe("describeSchema", () => {
  it("returns 'any' when the schema has no get method", () => {
    expect(describeSchema(undefined)).toBe("any");
    expect(describeSchema({})).toBe("any");
  });

  it("returns 'object' when the schema has no type", () => {
    expect(describeSchema(fromJS({ format: "date-time" }))).toBe("object");
  });

  it("returns the bare type when no format is present", () => {
    expect(describeSchema(fromJS({ type: "string" }))).toBe("string");
  });

  it("combines type and format", () => {
    expect(
      describeSchema(fromJS({ type: "string", format: "date-time" }))
    ).toBe("string($date-time)");
  });
});

describe("wrapContents", () => {
  it("renders a diff-wrap element with the status class and children", () => {
    const { container, getByText } = render(
      wrapContents("added", <span>child</span>)
    );
    const wrapper = container.querySelector(".diff-wrap");
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass("diff-added");
    expect(wrapper).toHaveStyle({ display: "contents" });
    expect(getByText("child")).toBeInTheDocument();
  });
});

describe("containsChange", () => {
  const schemas = fromJS({
    RoleEnum: { type: "string", "x-diff-status": "updated" },
    Plain: { type: "object", properties: { id: { type: "string" } } },
    Node: {
      type: "object",
      properties: {
        children: { type: "array", items: { $ref: "#/schemas/Node" } },
      },
    },
  });
  const resolveRef = (ref) => schemas.get(ref.replace("#/schemas/", ""));

  it("finds a change in a nested property", () => {
    const schema = fromJS({
      type: "object",
      properties: {
        preferences: {
          type: "object",
          properties: {
            language: { type: "string", "x-diff-status": "added" },
          },
        },
      },
    });
    expect(containsChange(schema)).toBe(true);
  });

  it.each([
    ["items", { items: { "x-diff-status": "deleted" } }],
    [
      "additionalProperties",
      { additionalProperties: { "x-diff-status": "added" } },
    ],
    ["allOf", { allOf: [{ type: "object" }, { "x-diff-status": "added" }] }],
    ["oneOf", { oneOf: [{ "x-diff-status": "updated" }] }],
    ["anyOf", { anyOf: [{ "x-diff-status": "deleted" }] }],
    ["not", { not: { "x-diff-status": "added" } }],
  ])("finds a change through %s", (_, schema) => {
    expect(containsChange(fromJS(schema))).toBe(true);
  });

  it("follows a $ref to a changed schema", () => {
    const schema = fromJS({
      type: "object",
      properties: { role: { $ref: "#/schemas/RoleEnum" } },
    });
    expect(containsChange(schema, resolveRef)).toBe(true);
  });

  it("terminates on a cyclic $ref without a change", () => {
    expect(containsChange(resolveRef("#/schemas/Node"), resolveRef)).toBe(
      false
    );
  });

  it("returns false when nothing below changed", () => {
    const schema = fromJS({
      type: "object",
      properties: {
        id: { type: "string", "x-diff-status": "unchanged" },
        plain: { $ref: "#/schemas/Plain" },
      },
      additionalProperties: true,
    });
    expect(containsChange(schema, resolveRef)).toBe(false);
  });

  it("ignores changes inside the x-diff-original / x-diff-new snapshots", () => {
    const schema = fromJS({
      type: "object",
      properties: { id: { type: "string" } },
      "x-diff-original": {
        properties: { gone: { "x-diff-status": "deleted" } },
      },
      "x-diff-new": { properties: { fresh: { "x-diff-status": "added" } } },
    });
    expect(containsChange(schema)).toBe(false);
  });

  it("treats an updated schema as containing its own change", () => {
    expect(containsChange(fromJS({ "x-diff-status": "updated" }))).toBe(true);
  });

  it("does not mark an added or deleted leaf as an ancestor", () => {
    expect(containsChange(fromJS({ "x-diff-status": "added" }))).toBe(false);
    expect(containsChange(fromJS({ "x-diff-status": "deleted" }))).toBe(false);
  });
});
