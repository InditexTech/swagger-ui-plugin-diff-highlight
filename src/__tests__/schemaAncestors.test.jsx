// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { fireEvent, render, waitFor } from "@testing-library/react";
import SwaggerUI from "swagger-ui-react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import DiffHighlightPlugin from "../DiffHighlightPlugin";

const spec = {
  openapi: "3.0.3",
  info: { title: "Ancestors", version: "1.0.0" },
  paths: {},
  components: {
    schemas: {
      RoleEnum: {
        title: "RoleEnum",
        type: "string",
        enum: ["admin", "member", "contributor"],
        "x-diff-status": "updated",
        "x-diff-original": { type: "string", enum: ["admin", "guest"] },
        "x-diff-new": { type: "string", enum: ["admin", "contributor"] },
      },
      User: {
        type: "object",
        properties: {
          role: { $ref: "#/components/schemas/RoleEnum" },
          email: { type: "string", "x-diff-status": "added" },
          old_token: { type: "string", "x-diff-status": "deleted" },
          timeout: {
            type: "integer",
            "x-diff-status": "updated",
            "x-diff-original": { type: "string" },
            "x-diff-new": { type: "integer" },
          },
          preferences: {
            type: "object",
            properties: {
              theme: { type: "string", "x-diff-status": "unchanged" },
              language: { type: "string", "x-diff-status": "added" },
            },
          },
          address: {
            type: "object",
            properties: { city: { type: "string" } },
          },
        },
      },
      Token: {
        type: "object",
        properties: { value: { type: "string" } },
      },
    },
  },
};

const rootSegment = (container, name) =>
  container.querySelector(`#model-${name} > .model-box`);

const propertySegment = (container, property) =>
  [...container.querySelectorAll("tr.property-row")]
    .find((row) => row.cells[0].textContent.trim() === property)
    ?.cells[1].querySelector(".model > span");

const isMarked = (segment) =>
  segment.classList.contains("diff-ancestor") &&
  segment.querySelector(":scope > .model-box-control") !== null;

beforeAll(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("schema accordions containing changes", () => {
  it("marks every segment that hides a change, collapsed or expanded", async () => {
    const { container } = render(
      <SwaggerUI spec={spec} plugins={[DiffHighlightPlugin]} />
    );
    await waitFor(() => expect(rootSegment(container, "Token")).not.toBeNull());

    expect(isMarked(rootSegment(container, "User"))).toBe(true);
    expect(isMarked(rootSegment(container, "RoleEnum"))).toBe(true);
    expect(rootSegment(container, "Token")).not.toHaveClass("diff-ancestor");

    fireEvent.click(rootSegment(container, "User").querySelector("button"));
    await waitFor(() =>
      expect(propertySegment(container, "preferences")).toBeTruthy()
    );

    const userHeader = container.querySelector(
      "#model-User .model > span > .model-box-control"
    );
    expect(userHeader).toHaveAttribute("aria-expanded", "true");
    expect(isMarked(userHeader.parentElement)).toBe(true);
    expect(isMarked(propertySegment(container, "preferences"))).toBe(true);
    expect(propertySegment(container, "address")).not.toHaveClass(
      "diff-ancestor"
    );
    expect(
      propertySegment(container, "email").closest(".diff-added")
    ).not.toBeNull();
    expect(
      propertySegment(container, "old_token").closest(".diff-deleted")
    ).not.toBeNull();

    const preferences = propertySegment(container, "preferences");
    fireEvent.click(preferences.querySelector(":scope > button"));
    await waitFor(() =>
      expect(propertySegment(container, "language")).toBeTruthy()
    );
    expect(preferences.querySelector(":scope > button")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(isMarked(preferences)).toBe(true);
    expect(
      propertySegment(container, "language").closest(".diff-added")
    ).not.toBeNull();
    expect(propertySegment(container, "theme")).not.toHaveClass(
      "diff-ancestor"
    );

    fireEvent.click(userHeader);
    await waitFor(() =>
      expect(propertySegment(container, "preferences")).toBeUndefined()
    );
    expect(isMarked(rootSegment(container, "User"))).toBe(true);
  });
});
