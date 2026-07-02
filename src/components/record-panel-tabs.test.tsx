// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RecordPanelTabs } from "@/components/record-panel-tabs";

afterEach(cleanup);

describe("RecordPanelTabs", () => {
  it("switches between fields, notes, and files", () => {
    render(
      <RecordPanelTabs
        fields={<p>Record fields</p>}
        fileCount={1}
        files={<p>Record files</p>}
        noteCount={2}
        notes={<p>Record notes</p>}
      />,
    );

    expect(screen.getByRole("tab", { name: "Fields" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Record fields")).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: /Notes/ }));
    expect(screen.getByText("Record notes")).toBeVisible();
    expect(screen.getByRole("tab", { name: /Notes/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: /Notes/ }), {
      key: "ArrowRight",
    });
    expect(screen.getByText("Record files")).toBeVisible();
  });

  it("shows clear empty states when notes or files are not configured", () => {
    render(<RecordPanelTabs fields={<p>Record fields</p>} />);

    fireEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect(screen.getByText("No notes available")).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Files" }));
    expect(screen.getByText("No files available")).toBeVisible();
  });
});
