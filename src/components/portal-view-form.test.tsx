// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortalViewForm } from "@/components/portal-view-form";

vi.mock("@/app/actions/admin", () => ({
  listShareableRecordsAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(cleanup);

describe("PortalViewForm stages", () => {
  it("preserves mounted input state while moving between setup stages", () => {
    render(
      <PortalViewForm
        action={vi.fn()}
        objects={[]}
        submitLabel="Create portal view"
      />,
    );

    const label = screen.getByLabelText("Navigation label");
    fireEvent.change(label, { target: { value: "Customer projects" } });
    fireEvent.click(screen.getByRole("button", { name: "Access" }));

    expect(screen.getByRole("button", { name: "Access" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(label).toHaveValue("Customer projects");
    expect(label.closest("section")).toHaveAttribute("hidden");
    expect(screen.getByLabelText("Sharing method").closest("section")).not.toHaveAttribute(
      "hidden",
    );
  });
});
