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

it("shows a maxLength change on an updated string schema", async () => {
  renderSchemas({
    Username: {
      ...changedSchema(
        { type: "string", maxLength: 100 },
        { type: "string", maxLength: 200 }
      ),
      title: "Username",
    },
  });
  const model = await openModel("Username");
  const toggle = within(model).getByRole("button", { name: /Username/ });
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(within(toggle).getByText("Username")).toBeInTheDocument();
  expect(model.querySelector(".prop-type")).toHaveTextContent("string");
  const changes = model.querySelector(".diff-schema-changes");
  expect(changes).toHaveTextContent("maxLength");
  expect(within(changes).getByText("100")).toHaveClass("diff-updated-old");
  expect(within(changes).getByText("200")).toHaveClass("diff-updated-new");
});

it("keeps the composed Shelf body, toggle and nested marks when it is updated", async () => {
  const shelf = (description, extra = {}) => ({
    title: "Shelf",
    description,
    allOf: [
      { type: "object", properties: { id: { type: "string" } } },
      {
        type: "object",
        properties: { label: { type: "string" }, ...extra },
      },
    ],
  });
  const before = shelf("Where books sit", {
    legacyCode: { type: "string" },
    capacity: { type: "string" },
  });
  const after = shelf("Where books are shelved", {
    capacity: { type: "integer" },
  });
  const marked = shelf("Where books are shelved", {
    label: { type: "string", "x-diff-status": "added" },
    legacyCode: { type: "string", "x-diff-status": "deleted" },
    capacity: {
      type: "integer",
      "x-diff-status": "updated",
      "x-diff-original": { type: "string" },
      "x-diff-new": { type: "integer" },
    },
  });
  renderSchemas({
    Shelf: {
      ...marked,
      "x-diff-status": "updated",
      "x-diff-original": before,
      "x-diff-new": after,
    },
  });
  const model = await openModel("Shelf", ".property-row");
  const toggle = within(model).getByRole("button", { name: /Shelf/ });
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(within(toggle).getByText("Shelf")).toBeInTheDocument();
  const changes = model.querySelector(".diff-schema-changes");
  expect(
    within(model)
      .getAllByText("Where books are shelved")
      .some((node) => !changes.contains(node))
  ).toBe(true);
  expect(within(model).getByText("id")).toBeInTheDocument();
  expect(
    model.querySelector(".diff-added").closest(".property-row")
  ).toHaveTextContent("label");
  expect(
    model.querySelector(".diff-deleted").closest(".property-row")
  ).toHaveTextContent("legacyCode");
  const capacity = [...model.querySelectorAll(".property-row")].find((row) =>
    row.textContent.startsWith("capacity")
  );
  fireEvent.click(within(capacity).getByRole("button"));
  expect(changeRows(capacity.querySelector(".diff-schema-changes"))).toEqual([
    "type: string → integer",
  ]);
  expect(changes).toHaveTextContent("description");
  expect(within(changes).getByText("Where books sit")).toHaveClass(
    "diff-updated-old"
  );
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(model.querySelector(".diff-schema-changes")).toBeNull();
});

const changeRows = (container) =>
  [...container.querySelectorAll(".diff-schema-change")].map((row) =>
    row.textContent.replace(/\s+/g, " ").trim()
  );

it.each([
  { kind: "changed enum", afterEnum: ["a", "c"], deleted: ["b"], added: ["c"] },
  { kind: "unchanged enum", afterEnum: ["a", "b"], deleted: [], added: [] },
])(
  "shows keyword changes next to a $kind",
  async ({ afterEnum, deleted, added }) => {
    renderSchemas({
      Code: changedSchema(
        { type: "string", enum: ["a", "b"], maxLength: 10 },
        { type: "string", enum: afterEnum, maxLength: 20 }
      ),
    });
    const model = await openModel("Code");
    const enumModel = model.querySelector(".prop-enum");
    fireEvent.click(within(enumModel).getByRole("button"));
    expect(
      [...enumModel.querySelectorAll(".diff-deleted")].map((n) => n.textContent)
    ).toEqual(deleted);
    expect(
      [...enumModel.querySelectorAll(".diff-added")].map((n) => n.textContent)
    ).toEqual(added);
    const changes = model.querySelector(".diff-schema-changes");
    expect(changeRows(changes)).toEqual(["maxLength: 10 → 20"]);
    expect(enumModel.contains(changes)).toBe(false);
    expect(model.querySelectorAll(".diff-type-change")).toHaveLength(0);
  }
);

it("shows added and removed scalar keywords, including false, zero and null", async () => {
  renderSchemas({
    Limits: changedSchema(
      { type: "integer", maximum: 0, nullable: false },
      { type: "integer", minimum: 0, default: null }
    ),
  });
  const model = await openModel("Limits");
  const changes = model.querySelector(".diff-schema-changes");
  expect(changeRows(changes)).toEqual([
    "maximum: 0",
    "nullable: false",
    "minimum: 0",
    "default: null",
  ]);
  expect(within(changes).getByText("false")).toHaveClass("diff-deleted");
  expect(within(changes).getAllByText("0")[1]).toHaveClass("diff-added");
  expect(within(changes).getByText("null")).toHaveClass("diff-added");
});

it.each([
  { kind: "both snapshots", snapshots: {} },
  { kind: "the original snapshot", snapshots: { "x-diff-new": {} } },
  { kind: "the new snapshot", snapshots: { "x-diff-original": {} } },
])(
  "keeps the native body and invents no values when $kind is missing",
  async ({ snapshots }) => {
    const body = {
      type: "object",
      title: "Parcel",
      properties: { weight: { type: "integer" } },
    };
    const schema = { ...body, "x-diff-status": "updated" };
    if (snapshots["x-diff-new"]) schema["x-diff-new"] = body;
    if (snapshots["x-diff-original"]) schema["x-diff-original"] = body;
    renderSchemas({ Parcel: schema });
    const model = await openModel("Parcel", ".property-row");
    expect(within(model).getByText("weight")).toBeInTheDocument();
    expect(model.querySelector(".diff-schema-changes")).toBeNull();
    expect(model.querySelector(".diff-updated-inline")).toBeNull();
    expect(model).not.toHaveTextContent("any");
  }
);

it("summarises structural changes and keeps nested marks inside their own rows", async () => {
  const box = (properties, items) => ({
    type: "object",
    title: "Box",
    properties: {
      ...properties,
      tags: { type: "array", ...items },
    },
  });
  const before = box(
    { size: { type: "string" } },
    { items: { type: "string" } }
  );
  const after = box(
    { size: { type: "integer" }, name: { type: "string" } },
    { items: { type: "integer" } }
  );
  const marked = box(
    {
      size: {
        type: "integer",
        "x-diff-status": "updated",
        "x-diff-original": { type: "string" },
        "x-diff-new": { type: "integer" },
      },
      name: { type: "string", "x-diff-status": "added" },
    },
    { items: { type: "integer" } }
  );
  renderSchemas({
    Box: {
      ...marked,
      "x-diff-status": "updated",
      "x-diff-original": before,
      "x-diff-new": after,
    },
  });
  expect(document.querySelector(".diff-schema-changes")).toBeNull();
  const model = await openModel("Box", ".property-row");
  const parentChanges = [...model.querySelectorAll(".diff-schema-changes")];
  expect(parentChanges).toHaveLength(1);
  expect(changeRows(parentChanges[0])).toEqual(["properties: changed"]);
  expect(
    model.querySelector(".diff-added").closest(".property-row")
  ).toHaveTextContent("name");
  const sizeRow = [...model.querySelectorAll(".property-row")].find((row) =>
    row.textContent.startsWith("size")
  );
  fireEvent.click(within(sizeRow).getByRole("button"));
  const nested = sizeRow.querySelector(".diff-schema-changes");
  expect(changeRows(nested)).toEqual(["type: string → integer"]);
  expect(parentChanges[0].closest(".property-row")).toBeNull();
  fireEvent.click(model.querySelector(".model-box-control"));
  expect(model.querySelector(".diff-schema-changes")).toBeNull();
});

it("summarises a changed array items schema compactly", async () => {
  renderSchemas({
    Tags: changedSchema(
      { type: "array", items: { type: "string" } },
      { type: "array", items: { type: "integer", format: "int32" } }
    ),
  });
  const model = await openModel("Tags", ".diff-schema-changes");
  const changes = model.querySelector(".diff-schema-changes");
  expect(changeRows(changes)).toEqual(["items: changed"]);
  expect(changes).not.toHaveTextContent("int32");
});

const renderOperations = (schemas) =>
  render(
    <SwaggerUI
      spec={{
        openapi: "3.0.3",
        info: { title: "Books", version: "1" },
        paths: {
          "/books": {
            get: {
              operationId: "listBooks",
              responses: {
                200: {
                  description: "ok",
                  content: {
                    "application/json": {
                      schema: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Book" },
                      },
                    },
                  },
                },
              },
            },
            post: {
              operationId: "addBook",
              requestBody: {
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Book" },
                  },
                },
              },
              responses: { 201: { description: "created" } },
            },
          },
        },
        components: { schemas },
      }}
      plugins={[DiffHighlightPlugin]}
      docExpansion="full"
      defaultModelRendering="model"
      defaultModelExpandDepth={2}
    />
  );

it("shows keyword changes of a referenced schema in request and response schema views", async () => {
  renderOperations({
    Book: changedSchema(
      {
        type: "object",
        properties: { isbn: { type: "string", maxLength: 10 } },
      },
      {
        type: "object",
        properties: { isbn: { type: "string", maxLength: 13 } },
      }
    ),
  });
  const operations = await waitFor(() => {
    const found = document.querySelectorAll(".opblock");
    expect(found).toHaveLength(2);
    return [...found];
  });
  for (const operation of operations) {
    await waitFor(() =>
      expect(operation.querySelector(".model-box")).toBeInTheDocument()
    );
    const body = operation.querySelector(".model-box");
    expect(within(body).getByText("isbn")).toBeInTheDocument();
    expect(body.querySelector(".diff-schema-changes")).toHaveTextContent(
      "properties: changed"
    );
  }
});

const parcelLabel = (maxLength) => ({ type: "string", maxLength });
const parcelSchema = changedSchema(
  {
    type: "object",
    title: "Parcel",
    properties: { label: parcelLabel(10) },
  },
  {
    type: "object",
    title: "Parcel",
    properties: { label: parcelLabel(13) },
  }
);
parcelSchema.properties.label = changedSchema(parcelLabel(10), parcelLabel(13));

const expectParameterModelKeepsNativeBody = async () => {
  await waitFor(() =>
    expect(document.querySelector(".parameters .model-box")).toBeInTheDocument()
  );
  const model = document.querySelector(".parameters .model-box");
  expect(within(model).getByText("label")).toBeInTheDocument();
  expect(model.querySelector(".model-box-control")).toBeInTheDocument();
  const labelRow = [...model.querySelectorAll(".property-row")].find((row) =>
    row.textContent.startsWith("label")
  );
  const summaries = [...model.querySelectorAll(".diff-schema-changes")];
  const [parent] = summaries.filter((el) => !labelRow.contains(el));
  expect(changeRows(parent)).toEqual(["properties: changed"]);
  expect(changeRows(labelRow.querySelector(".diff-schema-changes"))).toEqual([
    "maxLength: 10 → 13",
  ]);
};

it("keeps the native model and keyword changes for a Swagger 2 body parameter", async () => {
  render(
    <SwaggerUI
      spec={{
        swagger: "2.0",
        info: { title: "Parcels", version: "1" },
        paths: {
          "/parcels": {
            post: {
              operationId: "addParcel",
              consumes: ["application/json"],
              parameters: [{ name: "body", in: "body", schema: parcelSchema }],
              responses: { 201: { description: "created" } },
            },
          },
        },
      }}
      plugins={[DiffHighlightPlugin]}
      docExpansion="full"
      defaultModelRendering="model"
      defaultModelExpandDepth={2}
    />
  );
  await expectParameterModelKeepsNativeBody();
});

it("keeps the native model and keyword changes for an OAS3 parameter with JSON content", async () => {
  render(
    <SwaggerUI
      spec={{
        openapi: "3.0.3",
        info: { title: "Parcels", version: "1" },
        paths: {
          "/parcels": {
            get: {
              operationId: "findParcels",
              parameters: [
                {
                  name: "filter",
                  in: "query",
                  content: { "application/json": { schema: parcelSchema } },
                },
              ],
              responses: { 200: { description: "ok" } },
            },
          },
        },
      }}
      plugins={[DiffHighlightPlugin]}
      docExpansion="full"
      defaultModelRendering="model"
      defaultModelExpandDepth={2}
    />
  );
  await expectParameterModelKeepsNativeBody();
});
