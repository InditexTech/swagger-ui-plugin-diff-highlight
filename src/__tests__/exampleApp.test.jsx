// SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
// SPDX-License-Identifier: Apache-2.0
import { act, fireEvent, screen, within } from "@testing-library/react";
import { beforeAll, expect, it, vi } from "vitest";

beforeAll(async () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  // jsdom does not implement modal dialogs.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  await act(() => import("../../example/src/index.jsx"));
});

const openReport = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Show Changes Report" }));
  return screen.findByRole("dialog", { name: "API Changes Report" });
};

it("renders the diff view with inline changes enabled", async () => {
  expect(
    await screen.findByRole("button", { name: "Disable Inline Changes" })
  ).toHaveAttribute("aria-pressed", "true");
  expect(document.querySelector(".swagger-ui .diff-op-added")).not.toBeNull();
});

it("shows the report totals and stays open on clicks inside it", async () => {
  const dialog = await openReport();
  expect(dialog).toHaveAttribute("open");
  expect(within(dialog).getByText("added").parentElement).toHaveTextContent(
    "6 added"
  );
  fireEvent.click(within(dialog).getByRole("heading", { level: 2 }));
  expect(screen.getByRole("dialog")).toBe(dialog);

  fireEvent.click(within(dialog).getByRole("button", { name: "Close report" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("closes the report on Escape", async () => {
  const dialog = await openReport();
  // Browsers turn Escape on a modal dialog into a cancelable `cancel` event.
  const cancel = new Event("cancel", { cancelable: true });
  fireEvent(dialog, cancel);
  expect(cancel.defaultPrevented).toBe(true);
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("closes the report on a click outside the panel", async () => {
  const dialog = await openReport();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Dismiss report" })
  );
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("renders the clean spec without diff marks when inline changes are off", async () => {
  fireEvent.click(
    screen.getByRole("button", { name: "Disable Inline Changes" })
  );
  expect(
    await screen.findByRole("button", { name: "Enable Inline Changes" })
  ).toHaveAttribute("aria-pressed", "false");
  expect(document.querySelector(".swagger-ui [class*='diff-']")).toBeNull();
});
