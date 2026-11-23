// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { render, waitFor } from "@testing-library/react";
import SwaggerUI from "swagger-ui-react";
import { beforeEach, expect, it, vi } from "vitest";

import DiffHighlightPlugin from "../DiffHighlightPlugin";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

const deleted = (schema) => ({ ...schema, "x-diff-status": "deleted" });
const added = (schema) => ({ ...schema, "x-diff-status": "added" });
const updated = (before, after) => ({
  ...after,
  "x-diff-status": "updated",
  "x-diff-original": before,
  "x-diff-new": after,
});

const widgetSchema = () => ({
  type: "object",
  required: ["id", "legacyCode", "label"],
  properties: {
    id: { type: "string" },
    legacyCode: deleted({ type: "string" }),
    label: added({ type: "string" }),
    size: updated({ type: "string" }, { type: "integer" }),
    nested: {
      type: "object",
      properties: {
        cog: { type: "string" },
        sprocket: deleted({ type: "string" }),
      },
    },
    parts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          serial: { type: "string" },
          oldSerial: deleted({ type: "string" }),
        },
      },
    },
    gadget: {
      allOf: [
        { type: "object", properties: { base: { type: "string" } } },
        {
          type: "object",
          properties: {
            gear: { type: "string" },
            oldGear: deleted({ type: "string" }),
          },
        },
      ],
    },
  },
});

const consolidated = {
  id: "string",
  label: "string",
  size: 0,
  nested: { cog: "string" },
  parts: [{ serial: "string" }],
  gadget: { base: "string", gear: "string" },
};

const everything = {
  id: "string",
  legacyCode: "string",
  label: "string",
  size: 0,
  nested: { cog: "string", sprocket: "string" },
  parts: [{ serial: "string", oldSerial: "string" }],
  gadget: { base: "string", gear: "string", oldGear: "string" },
};

const withoutAnnotations = (value) =>
  JSON.parse(
    JSON.stringify(value, (key, item) =>
      key.startsWith("x-diff-") ? undefined : item
    )
  );

const renderOperation = ({
  schema,
  requestMedia = {},
  responseMedia = {},
  openapi = "3.0.3",
}) =>
  render(
    <SwaggerUI
      spec={{
        openapi,
        info: { title: "Examples", version: "1" },
        paths: {
          "/widgets": {
            post: {
              operationId: "addWidget",
              requestBody: {
                content: { "application/json": { schema, ...requestMedia } },
              },
              responses: {
                200: {
                  description: "ok",
                  content: {
                    "application/json": { schema, ...responseMedia },
                  },
                },
              },
            },
          },
        },
        components: { schemas: { Widget: schema } },
      }}
      plugins={[DiffHighlightPlugin]}
      docExpansion="full"
    />
  );

const readExamples = async () => {
  const read = () => ({
    request: document.querySelector(".body-param__example")?.textContent,
    response: document.querySelector(".responses-table .example")?.textContent,
  });
  await waitFor(() => {
    const { request, response } = read();
    expect(request).toBeTruthy();
    expect(response).toBeTruthy();
  });
  const { request, response } = read();
  return { request: JSON.parse(request), response: JSON.parse(response) };
};

it.each(["3.0.3", "3.1.0"])(
  "leaves deleted properties out of the examples of an OpenAPI %s spec",
  async (openapi) => {
    renderOperation({ schema: widgetSchema(), openapi });
    const { request, response } = await readExamples();
    expect(request).toEqual(consolidated);
    expect(response).toEqual(consolidated);
  }
);

it("keeps every property in the examples of a spec without diff annotations", async () => {
  renderOperation({ schema: withoutAnnotations(widgetSchema()) });
  const { request, response } = await readExamples();
  expect(request).toEqual(everything);
  expect(response).toEqual(everything);
});

it("leaves the authored schema example alone", async () => {
  const authored = { id: "w-1", legacyCode: "L-9" };
  renderOperation({ schema: { ...widgetSchema(), example: authored } });
  const { request, response } = await readExamples();
  expect(request).toEqual(authored);
  expect(response).toEqual(authored);
});

it("leaves the authored media type example alone", async () => {
  const authored = { id: "w-2", legacyCode: "L-7" };
  renderOperation({
    schema: widgetSchema(),
    requestMedia: { example: authored },
    responseMedia: { example: authored },
  });
  const { request, response } = await readExamples();
  expect(request).toEqual(authored);
  expect(response).toEqual(authored);
});

const compositionSchema = () => ({
  allOf: [
    { type: "object", properties: { keptMember: { type: "string" } } },
    deleted({
      type: "object",
      properties: { deletedMember: { type: "string" } },
    }),
    {
      type: "object",
      properties: {
        insideDeleted: deleted({ type: "string" }),
        insideKept: { type: "string" },
      },
    },
  ],
});

it.each(["3.0.3", "3.1.0"])(
  "keeps the retained allOf members of a property in an OpenAPI %s example",
  async (openapi) => {
    renderOperation({
      schema: {
        type: "object",
        properties: { composition: compositionSchema() },
      },
      openapi,
    });
    const { request, response } = await readExamples();
    const expected = {
      composition: { keptMember: "string", insideKept: "string" },
    };
    expect(request).toEqual(expected);
    expect(response).toEqual(expected);
  }
);

it.each(["3.0.3", "3.1.0"])(
  "keeps the retained allOf members of the top-level schema in an OpenAPI %s example",
  async (openapi) => {
    renderOperation({ schema: compositionSchema(), openapi });
    const { request, response } = await readExamples();
    const expected = { keptMember: "string", insideKept: "string" };
    expect(request).toEqual(expected);
    expect(response).toEqual(expected);
  }
);

it.each(["3.0.3", "3.1.0"])(
  "shows an array whose items schema is deleted in an OpenAPI %s example",
  async (openapi) => {
    renderOperation({
      schema: {
        type: "object",
        properties: {
          id: { type: "string" },
          tags: { type: "array", items: deleted({ type: "string" }) },
        },
      },
      openapi,
    });
    const { request, response } = await readExamples();
    expect(request).toEqual({ id: "string", tags: [] });
    expect(response).toEqual({ id: "string", tags: [] });
  }
);

it("keeps the retained allOf members and the empty array in a Swagger 2.0 example", async () => {
  const schema = {
    type: "object",
    properties: {
      composition: compositionSchema(),
      tags: { type: "array", items: deleted({ type: "string" }) },
    },
  };
  render(
    <SwaggerUI
      spec={{
        swagger: "2.0",
        info: { title: "Examples", version: "1" },
        paths: {
          "/widgets": {
            post: {
              operationId: "addWidget",
              consumes: ["application/json"],
              produces: ["application/json"],
              parameters: [{ in: "body", name: "body", schema }],
              responses: { 200: { description: "ok", schema } },
            },
          },
        },
      }}
      plugins={[DiffHighlightPlugin]}
      docExpansion="full"
    />
  );
  const { request, response } = await readExamples();
  const expected = {
    composition: { keptMember: "string", insideKept: "string" },
    tags: [],
  };
  expect(request).toEqual(expected);
  expect(response).toEqual(expected);
});

const partRef = { $ref: "#/components/schemas/Part" };

const linkedSchemas = () => ({
  Part: { type: "object", properties: { cog: { type: "string" } } },
  Widget: {
    type: "object",
    properties: {
      label: { type: "string" },
      legacy: deleted({ type: "string" }),
      linkedOld: deleted(partRef),
      linkedKept: partRef,
      listOld: deleted({ type: "array", items: partRef }),
      listKept: { type: "array", items: deleted(partRef) },
    },
  },
});

const linkedExpected = {
  label: "string",
  linkedKept: { cog: "string" },
  listKept: [],
};

const widgetRef = { $ref: "#/components/schemas/Widget" };

it.each(["3.0.3", "3.1.0"])(
  "leaves a deleted $ref schema out of an OpenAPI %s example",
  async (openapi) => {
    render(
      <SwaggerUI
        spec={{
          openapi,
          info: { title: "Examples", version: "1" },
          paths: {
            "/widgets": {
              post: {
                operationId: "addWidget",
                requestBody: {
                  content: { "application/json": { schema: widgetRef } },
                },
                responses: {
                  200: {
                    description: "ok",
                    content: { "application/json": { schema: widgetRef } },
                  },
                },
              },
            },
          },
          components: { schemas: linkedSchemas() },
        }}
        plugins={[DiffHighlightPlugin]}
        docExpansion="full"
      />
    );
    const { request, response } = await readExamples();
    expect(request).toEqual(linkedExpected);
    expect(response).toEqual(linkedExpected);
  }
);

it("leaves a deleted $ref schema out of a Swagger 2.0 example", async () => {
  const swaggerRef = { $ref: "#/definitions/Widget" };
  const definitions = JSON.parse(
    JSON.stringify(linkedSchemas()).replaceAll(
      "#/components/schemas/",
      "#/definitions/"
    )
  );
  render(
    <SwaggerUI
      spec={{
        swagger: "2.0",
        info: { title: "Examples", version: "1" },
        paths: {
          "/widgets": {
            post: {
              operationId: "addWidget",
              consumes: ["application/json"],
              produces: ["application/json"],
              parameters: [{ in: "body", name: "body", schema: swaggerRef }],
              responses: { 200: { description: "ok", schema: swaggerRef } },
            },
          },
        },
        definitions,
      }}
      plugins={[DiffHighlightPlugin]}
      docExpansion="full"
    />
  );
  const { request, response } = await readExamples();
  expect(request).toEqual(linkedExpected);
  expect(response).toEqual(linkedExpected);
});
