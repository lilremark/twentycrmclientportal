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

    fireEvent.click(screen.getByRole("button", { name: /view full note/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /view full note/i }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the dialog inside the branded application shell", () => {
    const shell = document.createElement("div");
    shell.className = "app-frame";
    shell.style.setProperty("--brand-primary", "#c2410c");
    document.body.append(shell);

    render(
      <PortalNotes
        canEdit={false}
        createAction={vi.fn()}
        notes={[{ id: "note-1", title: "Project update", body: "Complete." }]}
        updateAction={vi.fn()}
      />,
      { container: shell },
    );

    fireEvent.click(screen.getByRole("button", { name: /view full note/i }));

    expect(screen.getByRole("dialog", { name: "Project update" }).parentElement)
      .toHaveClass("note-modal-layer");
    expect(shell).toContainElement(
      screen.getByRole("dialog", { name: "Project update" }),
    );
  });

  it("selects a note without opening the dialog", () => {
    render(
      <PortalNotes
        canEdit={false}
        createAction={vi.fn()}
        notes={[
          { id: "note-1", title: "First note", body: "First." },
          { id: "note-2", title: "Second note", body: "Second." },
        ]}
        updateAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /second note/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Second.", { selector: ".record-note-view p" }))
      .toBeInTheDocument();
  });

  it("allows contributors to edit from the note dialog", () => {
    render(
      <PortalNotes
        canEdit
        createAction={vi.fn()}
        notes={[{ id: "note-1", title: "Project update", body: "Complete." }]}
        updateAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /view full note/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit note" }));

    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Project update",
    );
    expect(screen.getByRole("textbox", { name: "Body" })).toHaveValue(
      "Complete.",
    );
  });
});
// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
