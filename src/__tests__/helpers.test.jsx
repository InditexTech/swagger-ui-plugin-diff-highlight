// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { render } from "@testing-library/react";
import { fromJS } from "immutable";
import { describe, expect, it } from "vitest";

import {
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
