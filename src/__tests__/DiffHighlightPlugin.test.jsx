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

  it("renders the original component untouched when there is no status", () => {
    const { container } = render(
      <Wrapped schema={fromJS({ type: "string" })} />
    );
    expect(container.querySelector('[class^="diff-"]')).toBeNull();
    expect(container.textContent).toBe("original");
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
