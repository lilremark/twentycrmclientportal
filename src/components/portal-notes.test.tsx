import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortalNotes } from "@/components/portal-notes";

afterEach(cleanup);

describe("PortalNotes", () => {
  it("opens the complete note in a dialog", () => {
    const fullBody =
      "This is a long note body that must remain available beyond the list preview.";

    render(
      <PortalNotes
        canEdit={false}
        createAction={vi.fn()}
        notes={[{ id: "note-1", title: "Project update", body: fullBody }]}
        updateAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /project update/i }));

    const dialog = screen.getByRole("dialog", { name: "Project update" });
    expect(dialog).toHaveTextContent(fullBody);
  });

  it("closes the note dialog with Escape", () => {
    render(
      <PortalNotes
        canEdit={false}
        createAction={vi.fn()}
        notes={[{ id: "note-1", title: "Project update", body: "Complete." }]}
        updateAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /project update/i }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
