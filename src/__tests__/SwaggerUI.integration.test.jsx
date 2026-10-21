// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import SwaggerUI from "swagger-ui-react";
import { beforeEach, expect, it, vi } from "vitest";

import DiffHighlightPlugin from "../DiffHighlightPlugin";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

const changedSchema = (before, after) => ({
  ...after,
  "x-diff-status": "updated",
  "x-diff-original": before,
  "x-diff-new": after,
});

const renderSchemas = (schemas) =>
  render(
    <SwaggerUI
      spec={{
        openapi: "3.0.3",
        info: { title: "Enum regression", version: "1" },
        paths: {},
        components: { schemas },
      }}
      plugins={[DiffHighlightPlugin]}
      defaultModelExpandDepth={0}
    />
  );

async function openModel(name, content = ".prop-type") {
  fireEvent.click(
    await screen.findByRole("button", { name: new RegExp(name) })
  );
  await waitFor(() =>
    expect(
      document.querySelector(`[data-name="${name}"] ${content}`)
    ).toBeInTheDocument()
  );
  return document.querySelector(`[data-name="${name}"]`);
}

it("keeps the EnvironmentEnum title and both native accordions when opened", async () => {
  const before = { type: "string", enum: ["des", "test"] };
  const after = { type: "string", enum: ["des", "qa"] };
  render(
    <SwaggerUI
      spec={{
        openapi: "3.0.3",
        info: { title: "Enum regression", version: "1" },
        paths: {},
        components: {
          schemas: {
            EnvironmentEnum: {
              ...after,
              title: "EnvironmentEnum",
              description: "Deployment environment",
              "x-diff-status": "updated",
              "x-diff-original": before,
              "x-diff-new": after,
            },
          },
        },
      }}
      plugins={[DiffHighlightPlugin]}
      defaultModelExpandDepth={0}
    />
  );

  fireEvent.click(
    await screen.findByRole("button", { name: /EnvironmentEnum/ })
  );
  await waitFor(() =>
    expect(document.querySelector(".prop-type")).toBeInTheDocument()
  );
  const outer = screen.getByRole("button", { name: /EnvironmentEnum/ });
  expect(outer).toHaveAttribute("aria-expanded", "true");
  expect(outer).toBeInTheDocument();
  expect(within(outer).getByText("EnvironmentEnum")).toBeInTheDocument();
  const model = outer.closest(".model");
  expect(model.querySelector(".prop-type")).toHaveTextContent("string");
  expect(within(model).getByText("Deployment environment")).toBeInTheDocument();
  const enumModel = model.querySelector(".prop-enum");
  expect(enumModel).toHaveTextContent("Enum:");
  const inner = within(enumModel).getByRole("button");
  fireEvent.click(inner);
  expect(inner).toHaveAttribute("aria-expanded", "true");
  expect(enumModel.querySelector(".diff-deleted")).toHaveTextContent("test");
  expect(enumModel.querySelector(".diff-added")).toHaveTextContent("qa");
  expect(
    within(enumModel).getByText("des").closest(".diff-added, .diff-deleted")
  ).toBeNull();
  fireEvent.click(inner);
  expect(inner).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(inner);
  expect(enumModel.querySelector(".diff-added")).toHaveTextContent("qa");
  fireEvent.click(outer);
  expect(outer).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(screen.getByRole("button", { name: /EnvironmentEnum/ }));
  await waitFor(() =>
    expect(document.querySelector(".prop-enum")).toBeInTheDocument()
  );
  expect(
    screen.getByRole("button", { name: /EnvironmentEnum/ })
  ).toHaveAttribute("aria-expanded", "true");
});

it.each([
  {
    change: "added",
    before: { type: "string", enum: ["des"] },
    after: { type: "string", enum: ["des", "test"] },
    deleted: [],
    added: ["test"],
    neutral: ["des"],
  },
  {
    change: "removed",
    before: { type: "string", enum: ["des", "test"] },
    after: { type: "string", enum: ["des"] },
    deleted: ["test"],
    added: [],
    neutral: ["des"],
  },
  {
    change: "replaced",
    before: { type: "string", enum: ["des", "test"] },
    after: { type: "string", enum: ["des", "qa"] },
    deleted: ["test"],
    added: ["qa"],
    neutral: ["des"],
  },
  {
    change: "restriction added",
    before: { type: "string" },
    after: { type: "string", enum: ["test"] },
    deleted: ["unrestricted"],
    added: ["test"],
    neutral: [],
  },
  {
    change: "restriction removed",
    before: { type: "string", enum: ["test"] },
    after: { type: "string" },
    deleted: ["test"],
    added: ["unrestricted"],
    neutral: [],
  },
  {
    change: "unchanged",
    before: { type: "string", enum: ["test"] },
    after: { type: "string", enum: ["test"] },
    deleted: [],
    added: [],
    neutral: ["test"],
  },
  {
    change: "distinct JSON scalars",
    before: { type: "string", enum: [1, false, null] },
    after: { type: "string", enum: ["1", false, null] },
    deleted: ["1"],
    added: ["1"],
    neutral: ["false", "null"],
  },
  {
    change: "structurally equal JSON values",
    before: {
      type: "string",
      enum: [{ a: 1, b: 2 }, ["test", null], { nested: [{ a: 1, b: 2 }] }],
    },
    after: {
      type: "string",
      enum: [
        { b: 2, a: 1 },
        ["test", null],
        { nested: [{ b: 2, a: 1 }] },
        { a: 2 },
      ],
    },
    deleted: [],
    added: ['{"a":2}'],
    neutral: ['{"a":1,"b":2}', '["test",null]', '{"nested":[{"a":1,"b":2}]}'],
  },
  {
    change: "type and enum",
    before: { type: "string", enum: ["1"] },
    after: { type: "integer", format: "int64", enum: [1] },
    deleted: ["1"],
    added: ["1"],
    neutral: [],
    types: ["string", "integer($int64)"],
  },
  {
    change: "format and enum",
    before: { type: "string", format: "date", enum: ["test"] },
    after: { type: "string", format: "date-time", enum: ["test"] },
    deleted: [],
    added: [],
    neutral: ["test"],
    types: ["string($date)", "string($date-time)"],
  },
])(
  "renders $change in the native enum layout",
  async ({ before, after, deleted, added, neutral, types }) => {
    const schema = changedSchema(before, after);
    const snapshot = JSON.stringify(schema);
    renderSchemas({
      EnvironmentEnum: schema,
      SiblingEnum: { type: "string", enum: ["test", "qa"] },
    });
    const model = await openModel("EnvironmentEnum");
    expect(model.querySelector(".prop-type")).toHaveTextContent(after.type);
    if (after.format)
      expect(model.querySelector(".prop-format")).toHaveTextContent(
        `($${after.format})`
      );
    const enumModel = model.querySelector(".prop-enum");
    expect(enumModel.querySelector("br")).toBeInTheDocument();
    fireEvent.click(within(enumModel).getByRole("button"));
    expect(
      [...enumModel.querySelectorAll(".diff-deleted")].map(
        (node) => node.textContent
      )
    ).toEqual(deleted);
    expect(
      [...enumModel.querySelectorAll(".diff-added")].map(
        (node) => node.textContent
      )
    ).toEqual(added);
    for (const value of neutral)
      expect(
        within(enumModel)
          .getByText(value, { exact: true })
          .closest(".diff-added, .diff-deleted")
      ).toBeNull();
    if (types) {
      const transition = enumModel.querySelector(".diff-type-change");
      expect(transition).toHaveTextContent(`Type: ${types[0]} → ${types[1]}`);
      expect(transition.tagName).toBe("DIV");
      expect(transition.previousSibling.tagName).toBe("BR");
      expect(enumModel.querySelector(".diff-updated-old")).toHaveTextContent(
        types[0]
      );
      expect(enumModel.querySelector(".diff-updated-new")).toHaveTextContent(
        types[1]
      );
    } else {
      expect(model.querySelector(".diff-updated-arrow")).toBeNull();
    }
    expect(JSON.stringify(schema)).toBe(snapshot);
    const sibling = await openModel("SiblingEnum");
    const siblingEnum = sibling.querySelector(".prop-enum");
    fireEvent.click(within(siblingEnum).getByRole("button"));
    expect(siblingEnum).toHaveTextContent("[ test, qa ]");
    expect(sibling.querySelector('[class^="diff-"]')).toBeNull();
  }
);

it.each([
  { kind: "untyped", before: { enum: ["old"] }, after: { enum: ["new"] } },
  {
    kind: "object",
    before: { type: "object", enum: [{ mode: "old" }] },
    after: {
      type: "object",
      enum: [{ mode: "new" }],
      properties: { sibling: { type: "string", enum: ["plain"] } },
    },
  },
  {
    kind: "array",
    before: { type: "array", items: { type: "string" }, enum: [["old"]] },
    after: {
      type: "array",
      items: { type: "string", enum: ["plain"] },
      enum: [["new"]],
    },
  },
  {
    kind: "type-to-object",
    before: { type: "string", enum: ["old"] },
    after: { type: "object", enum: [{ mode: "new" }] },
  },
])(
  "renders $kind enum changes without replacing native models",
  async ({ before, after }) => {
    const schema = changedSchema(before, after);
    const snapshot = JSON.stringify(schema);
    renderSchemas({ ChangedEnum: schema });
    fireEvent.click(await screen.findByRole("button", { name: /ChangedEnum/ }));
    const model = document.querySelector('[data-name="ChangedEnum"]');
    const enumModel = await within(model).findByText("Enum:");
    const enumBlock = enumModel.closest(".prop-enum");
    expect(model.querySelectorAll(".prop-enum")).toHaveLength(1);
    expect(model).not.toHaveTextContent("x-diff-original");
    fireEvent.click(within(enumBlock).getByRole("button"));
    expect(enumBlock.querySelector(".diff-deleted")).toHaveTextContent("old");
    expect(enumBlock.querySelector(".diff-added")).toHaveTextContent("new");
    expect(model.querySelectorAll(".diff-added")).toHaveLength(1);
    expect(model.querySelectorAll(".diff-deleted")).toHaveLength(1);
    if (after.type !== "array")
      expect(model.querySelector(".brace-open.object")).toBeInTheDocument();
    if (after.properties || after.items?.enum) {
      const nestedButton = within(model)
        .getAllByRole("button")
        .find(
          (button) =>
            button !== within(enumBlock).getByRole("button") &&
            button.getAttribute("aria-expanded") === "false"
        );
      fireEvent.click(nestedButton);
      const enums = model.querySelectorAll(".prop-enum");
      expect(enums).toHaveLength(2);
      const nestedEnum = [...enums].find((node) => node !== enumBlock);
      fireEvent.click(within(nestedEnum).getByRole("button"));
      expect(nestedEnum).toHaveTextContent("plain");
      expect(nestedEnum.querySelector('[class^="diff-"]')).toBeNull();
    }
    const outer = within(model).getAllByRole("button")[0];
    fireEvent.click(outer);
    expect(outer).toHaveAttribute("aria-expanded", "false");
    expect(model.querySelector(".prop-enum")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /ChangedEnum/ }));
    await waitFor(() =>
      expect(
        document.querySelector('[data-name="ChangedEnum"] .prop-enum')
      ).toBeInTheDocument()
    );
    expect(JSON.stringify(schema)).toBe(snapshot);
  }
);

it("preserves genuine non-enum type changes", async () => {
  renderSchemas({
    ChangedType: changedSchema(
      { type: "string" },
      { type: "integer", format: "int64" }
    ),
  });
  fireEvent.click(await screen.findByRole("button", { name: /ChangedType/ }));
  expect(await screen.findByText("integer($int64)")).toHaveClass(
    "diff-updated-new"
  );
  expect(screen.getByText("string")).toHaveClass("diff-updated-old");
});

it("highlights an enum referenced by an object property without changing its sibling", async () => {
  renderSchemas({
    EnvironmentEnum: changedSchema(
      { type: "string", enum: ["des", "test"] },
      { type: "string", enum: ["des", "qa"] }
    ),
    Deployment: {
      type: "object",
      properties: {
        environment: { $ref: "#/components/schemas/EnvironmentEnum" },
        sibling: { type: "string", enum: ["test", "qa"] },
      },
    },
  });
  const model = await openModel("Deployment", ".property-row");
  const rows = [...model.querySelectorAll(".property-row")];
  const environment = rows.find((row) =>
    row.textContent.includes("environment")
  );
  fireEvent.click(within(environment).getByRole("button"));
  const enumButton = within(environment).getByRole("button", { name: /Array/ });
  fireEvent.click(enumButton);
  expect(environment.querySelector(".diff-deleted")).toHaveTextContent("test");
  expect(environment.querySelector(".diff-added")).toHaveTextContent("qa");
  const sibling = rows.find((row) => row.textContent.includes("sibling"));
  fireEvent.click(within(sibling).getByRole("button"));
  fireEvent.click(within(sibling).getByRole("button", { name: /Array/ }));
  expect(sibling).toHaveTextContent("[ test, qa ]");
  expect(sibling.querySelector('[class^="diff-"]')).toBeNull();
});
