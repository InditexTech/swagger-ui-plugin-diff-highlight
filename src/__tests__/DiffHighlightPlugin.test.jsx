// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { render } from "@testing-library/react";
import { fromJS, List } from "immutable";
import { describe, expect, it } from "vitest";

import DiffHighlightPlugin from "../DiffHighlightPlugin";

const { wrapComponents } = DiffHighlightPlugin();

/** Stub that stands in for the wrapped swagger-ui component. */
const Original = () => <span>original</span>;

describe("wrapComponents.Model", () => {
  const Wrapped = wrapComponents.Model(Original);

  it("wraps deleted schemas in a .diff-deleted span", () => {
    const { container } = render(
      <Wrapped schema={fromJS({ "x-diff-status": "deleted" })} />
    );
    expect(container.querySelector(".diff-deleted")).not.toBeNull();
  });

  it("wraps added schemas in a .diff-added span", () => {
    const { container } = render(
      <Wrapped schema={fromJS({ "x-diff-status": "added" })} />
    );
    expect(container.querySelector(".diff-added")).not.toBeNull();
  });

  it("renders old and new descriptions for updated schemas", () => {
    const schema = fromJS({
      "x-diff-status": "updated",
      "x-diff-original": { type: "string" },
      "x-diff-new": { type: "integer", format: "int64" },
    });
    const { container } = render(<Wrapped schema={schema} />);
    expect(container.querySelector(".diff-updated-old").textContent).toBe(
      "string"
    );
    expect(container.querySelector(".diff-updated-new").textContent).toBe(
      "integer($int64)"
    );
  });

  it.each([
    {
      change: "added",
      before: ["des", "pre", "pro", "stage"],
      after: ["des", "pre", "pro", "stage", "test"],
      deleted: [],
      added: ['"test"'],
    },
    {
      change: "removed",
      before: ["des", "pre", "pro", "stage", "test"],
      after: ["des", "pre", "pro", "stage"],
      deleted: ['"test"'],
      added: [],
    },
    {
      change: "replaced",
      before: ["des", "pre", "pro", "stage", "test"],
      after: ["des", "pre", "pro", "stage", "qa"],
      deleted: ['"test"'],
      added: ['"qa"'],
    },
  ])(
    "shows $change EnvironmentEnum values without an unchanged type comparison",
    ({ before, after, deleted, added }) => {
      const schema = fromJS({
        title: "EnvironmentEnum",
        type: "string",
        enum: after,
        "x-diff-status": "updated",
        "x-diff-original": {
          title: "EnvironmentEnum",
          type: "string",
          enum: before,
        },
        "x-diff-new": {
          title: "EnvironmentEnum",
          type: "string",
          enum: after,
        },
      });
      const { container, getByText } = render(<Wrapped schema={schema} />);

      expect(
        [...container.querySelectorAll(".diff-deleted")].map(
          (element) => element.textContent
        )
      ).toEqual(deleted);
      expect(
        [...container.querySelectorAll(".diff-added")].map(
          (element) => element.textContent
        )
      ).toEqual(added);
      for (const value of ['"des"', '"pre"', '"pro"', '"stage"']) {
        expect(
          getByText(value, { exact: true }).closest(
            ".diff-deleted, .diff-added"
          )
        ).toBeNull();
      }
      expect(container.querySelector(".diff-updated-arrow")).toBeNull();
      expect(container.textContent).not.toContain("string → string");
    }
  );

  it("renders the original component untouched when there is no status", () => {
    const { container } = render(
      <Wrapped schema={fromJS({ type: "string" })} />
    );
    expect(container.querySelector('[class^="diff-"]')).toBeNull();
    expect(container.textContent).toBe("original");
  });

  it.each([
    {
      change: "adding an enum restriction",
      before: { type: "string" },
      after: { type: "string", enum: ["test"] },
      deleted: ["unrestricted"],
      added: ['"test"'],
      neutral: [],
    },
    {
      change: "removing an enum restriction",
      before: { type: "string", enum: ["test"] },
      after: { type: "string" },
      deleted: ['"test"'],
      added: ["unrestricted"],
      neutral: [],
    },
    {
      change: "unchanged enum and type",
      before: { type: "string", enum: ["test"] },
      after: { type: "string", enum: ["test"] },
      deleted: [],
      added: [],
      neutral: ['"test"'],
    },
    {
      change: "distinct JSON scalar values",
      before: { enum: [1, false, null] },
      after: { enum: ["1", false, null] },
      deleted: ["1"],
      added: ['"1"'],
      neutral: ["false", "null"],
    },
    {
      change: "structurally equal JSON values",
      before: { enum: [{ a: 1, b: 2 }, ["test", null]] },
      after: { enum: [{ b: 2, a: 1 }, ["test", null], { a: 2 }] },
      deleted: [],
      added: ['{"a":2}'],
      neutral: ['{"a":1,"b":2}', '["test",null]'],
    },
    {
      change: "type and format changes alongside enum changes",
      before: { type: "string", enum: ["1"] },
      after: { type: "integer", format: "int64", enum: [1] },
      deleted: ['"1"'],
      added: ["1"],
      neutral: [],
      types: ["string", "integer($int64)"],
    },
    {
      change: "format changes alongside unchanged enums",
      before: { type: "string", format: "date", enum: ["test"] },
      after: { type: "string", format: "date-time", enum: ["test"] },
      deleted: [],
      added: [],
      neutral: ['"test"'],
      types: ["string($date)", "string($date-time)"],
    },
  ])("handles $change", ({ before, after, deleted, added, neutral, types }) => {
    const schema = fromJS({
      ...after,
      "x-diff-status": "updated",
      "x-diff-original": before,
      "x-diff-new": after,
    });
    const { container, getByText } = render(<Wrapped schema={schema} />);

    expect(
      [...container.querySelectorAll(".diff-deleted")].map(
        (element) => element.textContent
      )
    ).toEqual(deleted);
    expect(
      [...container.querySelectorAll(".diff-added")].map(
        (element) => element.textContent
      )
    ).toEqual(added);
    for (const value of neutral) {
      expect(
        getByText(value, { exact: true }).closest(".diff-deleted, .diff-added")
      ).toBeNull();
    }
    if (types) {
      expect(container.querySelector(".diff-updated-old").textContent).toBe(
        types[0]
      );
      expect(container.querySelector(".diff-updated-new").textContent).toBe(
        types[1]
      );
      expect(container.querySelector(".diff-updated-arrow")).not.toBeNull();
    } else {
      expect(container.querySelector(".diff-updated-arrow")).toBeNull();
    }
  });
});

describe("wrapComponents.parameterRow", () => {
  const Wrapped = wrapComponents.parameterRow(Original);

  it("wraps changed parameters read from props.param", () => {
    const { container } = render(
      <Wrapped param={fromJS({ "x-diff-status": "added" })} />
    );
    expect(container.querySelector(".diff-wrap.diff-added")).not.toBeNull();
  });

  it("falls back to props.rawParam", () => {
    const { container } = render(
      <Wrapped rawParam={fromJS({ "x-diff-status": "deleted" })} />
    );
    expect(container.querySelector(".diff-wrap.diff-deleted")).not.toBeNull();
  });

  it("passes through when status is unchanged", () => {
    const { container } = render(
      <Wrapped param={fromJS({ "x-diff-status": "unchanged" })} />
    );
    expect(container.querySelector(".diff-wrap")).toBeNull();
  });
});

describe("wrapComponents.response", () => {
  const Wrapped = wrapComponents.response(Original);

  it("wraps changed responses", () => {
    const { container } = render(
      <Wrapped response={fromJS({ "x-diff-status": "added" })} />
    );
    expect(container.querySelector(".diff-wrap.diff-added")).not.toBeNull();
  });

  it("passes through when there is no status", () => {
    const { container } = render(<Wrapped response={fromJS({})} />);
    expect(container.querySelector(".diff-wrap")).toBeNull();
  });
});

describe("wrapComponents.operation", () => {
  const Wrapped = wrapComponents.operation(Original);

  const makeSpecSelectors = (op) => ({
    specJson: () => fromJS({ paths: { "/pets": { get: op } } }),
  });

  it("wraps operations whose status is read from the unresolved spec", () => {
    const props = {
      specSelectors: makeSpecSelectors({ "x-diff-status": "added" }),
      specPath: List(["paths", "/pets", "get"]),
    };
    const { container } = render(<Wrapped {...props} />);
    expect(container.querySelector(".diff-op.diff-op-added")).not.toBeNull();
  });

  it("passes through when the operation is unchanged", () => {
    const props = {
      specSelectors: makeSpecSelectors({ "x-diff-status": "unchanged" }),
      specPath: List(["paths", "/pets", "get"]),
    };
    const { container } = render(<Wrapped {...props} />);
    expect(container.querySelector(".diff-op")).toBeNull();
  });

  it("passes through when specSelectors is missing", () => {
    const { container } = render(<Wrapped />);
    expect(container.querySelector(".diff-op")).toBeNull();
    expect(container.textContent).toBe("original");
  });
});
