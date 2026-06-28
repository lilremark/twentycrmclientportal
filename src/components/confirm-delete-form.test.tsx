// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmDeleteForm } from "@/components/confirm-delete-form";

afterEach(cleanup);

describe("ConfirmDeleteForm", () => {
  it("requires the confirmation phrase and closes with Escape", async () => {
    render(
      <ConfirmDeleteForm
        action={vi.fn()}
        description="This portal view will no longer be available."
        title="Delete portal view?"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "Delete portal view?",
    });
    expect(dialog).toBeVisible();

    const confirmButton = within(dialog).getByRole("button", { name: "Delete" });
    expect(confirmButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type yes to confirm/i), {
      target: { value: "yes" },
    });
    expect(confirmButton).toBeEnabled();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(
        screen.queryByRole("alertdialog", { name: "Delete portal view?" }),
      ).not.toBeInTheDocument();
    });
  });
});
